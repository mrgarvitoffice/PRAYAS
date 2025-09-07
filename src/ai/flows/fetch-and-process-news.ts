'use server';

/**
 * @fileOverview A Genkit flow to fetch news and transform it into the Article format.
 *
 * - fetchAndProcessNews - Fetches news and performs basic data transformation.
 * - FetchAndProcessNewsInput - Input for the flow.
 * - FetchAndProcessNewsOutput - Output for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchNews } from '@/services/newsdata';
import type { Article, NewsDataArticle } from '@/lib/types';

const FetchAndProcessNewsInputSchema = z.object({
  category: z.string().describe('The news category to fetch.'),
  country: z.string().describe('The country code (e.g., "in", "us").'),
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
function transformArticle(article: NewsDataArticle): Article {
  const publishedAt = new Date(article.pubDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const rawContent = article.content || article.description || '';

  return {
    id: article.article_id,
    title: article.title,
    // Placeholder fields, will be filled in on-demand by the client
    titleHi: '',
    summary: (article.description || rawContent).slice(0, 200) || 'No description available.',
    summaryHi: '',
    importantPoints: [],
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
  async ({ category, country }) => {
    const newsResponse = await fetchNews(category, country);
    const articles = newsResponse.results || [];
    
    // Filter out articles that have no title or content to process
    const validArticles = articles.filter(article => article.title && (article.content || article.description));

    // Transform valid articles
    const transformedArticles = validArticles.map(transformArticle);
    
    return transformedArticles;
  }
);

export async function fetchAndProcessNews(
  input: FetchAndProcessNewsInput
): Promise<FetchAndProcessNewsOutput> {
  return fetchAndProcessNewsFlow(input);
}
