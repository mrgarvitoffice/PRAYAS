
'use server';

/**
 * @fileOverview A Genkit flow to summarize a list of articles for podcast generation.
 * This flow takes multiple articles and returns them with AI-generated summaries.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Article } from '@/lib/types';

// Define the input schema: an array of articles.
const SummarizeArticlesForPodcastInputSchema = z.object({
  articles: z.array(z.any()).describe("An array of article objects to summarize."),
});
export type SummarizeArticlesForPodcastInput = z.infer<typeof SummarizeArticlesForPodcastInputSchema>;


// Define the output schema: an array of articles with summaries.
const SummarizeArticlesForPodcastOutputSchema = z.object({
    articles: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            summary: z.string().describe("A concise, AI-generated summary of the article content."),
            // Include other fields to pass them through
            titleHi: z.string(),
            summaryHi: z.string(),
            importantPoints: z.array(z.string()),
            importantPointsHi: z.array(z.string()),
            contentUrl: z.string(),
            source: z.any(),
            publishedAt: z.string(),
            country: z.string(),
            state: z.string().nullable(),
            city: z.string().nullable(),
            category: z.string(),
            media: z.any(),
            rank_score: z.number(),
            rawContent: z.string(),
        })
    ).describe("The array of articles with AI-generated summaries.")
});

export type SummarizeArticlesForPodcastOutput = z.infer<typeof SummarizeArticlesForPodcastOutputSchema>;

export async function summarizeArticlesForPodcast(input: SummarizeArticlesForPodcastInput): Promise<SummarizeArticlesForPodcastOutput> {
    try {
        return await summarizeArticlesForPodcastFlow(input);
    } catch(e: any) {
        console.error("[AI Action Error - Summarize for Podcast] Flow failed:", e);
        const errorMessage = e.message || "An unknown error occurred while summarizing articles.";
        throw new Error(errorMessage);
    }
}

// Define the prompt for summarizing a single article.
const summarizationPrompt = ai.definePrompt({
  name: 'summarizeArticleForPodcastPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: { schema: z.object({ title: z.string(), content: z.string() }) },
  output: { schema: z.object({ summary: z.string() }) },
  prompt: `You are an expert news summarizer. Create a concise, high-quality summary for the following news article. The summary should be fluent, well-written, and capture the key points of the article.

Article Title: {{{title}}}
Article Content:
---
{{{content}}}
---

Please provide the summary in the specified JSON format.`,
});


const summarizeArticlesForPodcastFlow = ai.defineFlow(
  {
    name: 'summarizeArticlesForPodcastFlow',
    inputSchema: SummarizeArticlesForPodcastInputSchema,
    outputSchema: SummarizeArticlesForPodcastOutputSchema,
  },
  async ({ articles }) => {
    console.log(`[AI Flow - Summarize for Podcast] Starting summarization for ${articles.length} articles.`);

    // Create an array of promises, one for each article to be summarized.
    const summarizationPromises = articles.map(async (article: Article) => {
      try {
        // If the article has no raw content, we can't summarize it.
        if (!article.rawContent || article.rawContent.trim().length < 50) {
            console.warn(`[AI Flow - Summarize for Podcast] Skipping article "${article.title}" due to insufficient content.`);
            return { ...article, summary: article.summary || "Summary not available." }; // Return original article with existing summary
        }
        
        const { output } = await summarizationPrompt({
          title: article.title,
          content: article.rawContent,
        });

        if (!output?.summary) {
            throw new Error(`AI returned an empty summary for article: ${article.title}`);
        }

        // Return a new article object with the AI-generated summary.
        return { ...article, summary: output.summary };

      } catch (error) {
        console.error(`[AI Flow - Summarize for Podcast] Failed to summarize article "${article.title}".`, error);
        // If one article fails, we don't want the whole batch to fail.
        // Return the original article with its existing summary as a fallback.
        return { ...article, summary: article.summary || "Summary could not be generated." };
      }
    });

    // Wait for all the summarization promises to resolve.
    const summarizedArticles = await Promise.all(summarizationPromises);

    console.log('[AI Flow - Summarize for Podcast] Finished summarizing all articles.');
    
    return { articles: summarizedArticles };
  }
);
