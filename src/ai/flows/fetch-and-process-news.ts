'use server';

/**
 * @fileOverview A Genkit flow to fetch news, summarize it, and translate it.
 *
 * - fetchAndProcessNews - Fetches news, summarizes, and translates.
 * - FetchAndProcessNewsInput - Input for the flow.
 * - FetchAndProcessNewsOutput - Output for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchNews } from '@/services/newsdata';
import { summarizeArticle } from './summarize-article';
import { translateAndSummarizeArticleHindi } from './translate-and-summarize-article-hindi';
import type { Article, NewsDataArticle } from '@/lib/types';

const FetchAndProcessNewsInputSchema = z.object({
  category: z.string().describe('The news category to fetch.'),
  country: z.string().describe('The country code (e.g., "in", "us").'),
});
export type FetchAndProcessNewsInput = z.infer<
  typeof FetchAndProcessNewsInputSchema
>;

const FetchAndProcessNewsOutputSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    titleHi: z.string(),
    summary: z.string(),
    summaryHi: z.string(),
    importantPoints: z.array(z.string()),
    importantPointsHi: z.array(z.string()),
    contentUrl: z.string(),
    source: z.object({ name: z.string(), cred_score: z.number() }),
    publishedAt: z.string(),
    country: z.string(),
    state: z.string().nullable(),
    city: z.string().nullable(),
    category: z.string(),
    media: z.object({ image: z.string() }),
    rank_score: z.number(),
  })
);

export type FetchAndProcessNewsOutput = z.infer<
  typeof FetchAndProcessNewsOutputSchema
>;

async function processArticle(
  article: NewsDataArticle
): Promise<Article | null> {
  try {
    const fullText = article.content || article.description || '';
    // Skip articles that have no title or content to process
    if (!article.title || !fullText) {
      console.warn(`Skipping article ${article.article_id} due to missing title or content.`);
      return null;
    }

    // Summarize in English
    const englishSummary = await summarizeArticle({
      title: article.title,
      full_text: fullText,
    });

    // Translate and summarize in Hindi
    const hindiSummary = await translateAndSummarizeArticleHindi({
      articleTitle: article.title,
      articleContent: fullText,
    });

    const publishedAt = new Date(article.pubDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      id: article.article_id,
      title: englishSummary.heading,
      titleHi: hindiSummary.translatedTitle,
      summary: (article.description || englishSummary.important_points.join(' ')).slice(0, 200),
      summaryHi: hindiSummary.summaryPoints.join(' '),
      importantPoints: englishSummary.important_points,
      importantPointsHi: hindiSummary.summaryPoints,
      contentUrl: article.link,
      source: { name: article.source_id, cred_score: 0.8 }, // Placeholder
      publishedAt: publishedAt,
      country: article.country[0] || 'World',
      state: null, // newsdata.io doesn't provide state/city reliably
      city: null,
      category: article.category[0] || 'General',
      media: {
        image: `https://picsum.photos/600/400?random=${article.article_id}`,
      },
      rank_score: 90, // Placeholder
    };
  } catch (error) {
    console.error(`Failed to process article ${article.article_id}:`, error);
    return null;
  }
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

    const processingPromises = articles.map(processArticle);
    const processedArticles = await Promise.all(processingPromises);

    // Filter out any null results from processing
    return processedArticles.filter((a): a is Article => a !== null);
  }
);

export async function fetchAndProcessNews(
  input: FetchAndProcessNewsInput
): Promise<FetchAndProcessNewsOutput> {
  return fetchAndProcessNewsFlow(input);
}
