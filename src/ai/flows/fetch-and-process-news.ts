
'use server';

/**
 * @fileOverview A Genkit flow to fetch news and transform it into the Article format.
 *
 * - fetchAndProcessNews - Fetches news and performs basic data transformation.
 * - FetchAndProcessNewsInput - Input for the flow.
 * - FetchAndProcessNewsOutput - Output for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchNews } from '@/services/newsdata';
import type { Article, NewsDataArticle } from '@/lib/types';
import { summarizeArticle } from './summarize-article';

const FetchAndProcessNewsInputSchema = z.object({
  category: z.string().describe('The news category to fetch.'),
  country: z.string().describe('The country code (e.g., "in", "us").'),
  state: z.string().optional().describe('The state to fetch news from.'),
  city: z.string().optional().describe('The city to fetch news from.'),
});
export type FetchAndProcessNewsInput = z.infer<
  typeof FetchAndProcessNewsInputSchema
>;

// The output schema now matches the raw article structure more closely,
// as summarization is handled on the client.
const FetchAndProcessNewsOutputSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    titleHi: z.string(), // Will be populated on demand
    summary: z.string(),
    summaryHi: z.string(), // Will be populated on demand
    importantPoints: z.array(z.string()), // Will be populated on demand
    importantPointsHi: z.array(z.string()), // Will be populated on demand
    contentUrl: z.string(),
    source: z.object({ name: z.string(), cred_score: z.number() }),
    publishedAt: z.string(),
    country: z.string(),
    state: z.string().nullable(),
    city: z.string().nullable(),
    category: z.string(),
    media: z.object({ image: z.string() }),
    rank_score: z.number(),
    // Add raw content for on-demand processing
    rawContent: z.string(),
  })
);

export type FetchAndProcessNewsOutput = z.infer<
  typeof FetchAndProcessNewsOutputSchema
>;

// This function now does a simple transformation, not expensive AI processing.
function transformArticle(article: NewsDataArticle, importantPoints: string[] = []): Article {
  const publishedAt = new Date(article.pubDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const rawContent = article.content || article.description || '';
  
  let summary = (article.description || rawContent) || 'No description available.';
  if (summary.length > 200) {
    const truncated = summary.slice(0, 200);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > 0) {
      summary = truncated.substring(0, lastPeriod + 1);
    } else {
      summary = truncated + '...';
    }
  }


  return {
    id: article.article_id,
    title: article.title,
    // Placeholder fields, will be filled in on-demand by the client
    titleHi: '',
    summary: summary,
    summaryHi: '',
    importantPoints: importantPoints,
    importantPointsHi: [],
    rawContent: rawContent,
    contentUrl: article.link,
    source: { name: article.source_id, cred_score: 0.8 }, // Placeholder
    publishedAt: publishedAt,
    country: article.country[0] || 'World',
    state: null, // newsdata.io doesn't provide state/city reliably
    city: null,
    category: article.category[0] || 'General',
    media: {
      image: article.image_url || `https://picsum.photos/600/400?random=${article.article_id}`,
    },
    rank_score: 90, // Placeholder
  };
}

const fetchAndProcessNewsFlow = ai.defineFlow(
  {
    name: 'fetchAndProcessNewsFlow',
    inputSchema: FetchAndProcessNewsInputSchema,
    outputSchema: FetchAndProcessNewsOutputSchema,
  },
  async ({ category, country, state, city }) => {
    const newsResponse = await fetchNews(category, country, state, city);
    const articles = newsResponse.results || [];
    
    // Filter out articles that have no title or content to process
    let validArticles = articles.filter(article => article.title && (article.content || article.description));
    
    // Attempt to filter out small channels and prioritize major platforms
    const MAJOR_SOURCES = ['timesofindia', 'ndtv', 'thehindu', 'indianexpress', 'hindustantimes', 'bbc', 'cnn', 'reuters', 'apnews', 'moneycontrol', 'livemint', 'aljazeera', 'bloomberg', 'cnbc', 'wsj', 'nytimes', 'washingtonpost', 'news18', 'indiatoday'];
    const majorArticles = validArticles.filter(article => MAJOR_SOURCES.some(source => article.source_id?.toLowerCase().includes(source) || article.link?.toLowerCase().includes(source)));
    
    // If we have enough high-quality articles from major networks, filter out the obscure blogs completely!
    if (majorArticles.length >= 5) {
        validArticles = majorArticles;
    }

    // Transform valid articles
    const transformedArticles = await Promise.all(validArticles.map(async (article) => {
        try {
            const summaryResult = await summarizeArticle({
                title: article.title,
                full_text: article.content || article.description || '',
            });
            return transformArticle(article, summaryResult.important_points);
        } catch (e) {
            console.error(`Could not summarize article ${article.article_id}`, e);
            // Fallback: extract sentences from description to provide 3 points
            const rawText = article.description || article.content || '';
            const sentences = rawText.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 15);
            
            let fallbackPoints: string[] = [];
            if (sentences.length >= 3) {
              fallbackPoints = sentences.slice(0, 3);
            } else if (sentences.length > 0) {
              fallbackPoints = [...sentences, "Click Read More for full details."];
            } else {
              fallbackPoints = [
                "Key developments reported in recent events.", 
                "Information regarding this news is currently limited.", 
                "Please read the full article for more details."
              ];
            }
            return transformArticle(article, fallbackPoints.slice(0, 3));
        }
    }));
    
    return transformedArticles;
  }
);

export async function fetchAndProcessNews(
  input: FetchAndProcessNewsInput
): Promise<FetchAndProcessNewsOutput> {
  return fetchAndProcessNewsFlow(input);
}
