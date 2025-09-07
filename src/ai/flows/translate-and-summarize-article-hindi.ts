
'use server';

/**
 * @fileOverview A Genkit flow to translate an article into Hindi using simplified UPSC-friendly vocabulary
 * and then summarize the translated article (headline + 2-4 key points).
 *
 * - translateAndSummarizeArticleHindi - A function that handles the translation and summarization process.
 * - TranslateAndSummarizeArticleHindiInput - The input type for the translateAndSummarizeArticleHindi function.
 * - TranslateAndSummarizeArticleHindiOutput - The return type for the translateAndSummarizeArticleHindi function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateAndSummarizeArticleHindiInputSchema = z.object({
  articleTitle: z.string().describe('The title of the article to translate and summarize.'),
  articleContent: z.string().describe('The full content of the article to translate.'),
});
export type TranslateAndSummarizeArticleHindiInput = z.infer<typeof TranslateAndSummarizeArticleHindiInputSchema>;

const TranslateAndSummarizeArticleHindiOutputSchema = z.object({
  translatedTitle: z.string().describe('The translated title of the article in Hindi.'),
  summaryPoints: z.array(z.string()).describe('A list of 2-4 key summary points of the translated article in Hindi.'),
});
export type TranslateAndSummarizeArticleHindiOutput = z.infer<typeof TranslateAndSummarizeArticleHindiOutputSchema>;

export async function translateAndSummarizeArticleHindi(
  input: TranslateAndSummarizeArticleHindiInput
): Promise<TranslateAndSummarizeArticleHindiOutput> {
  return translateAndSummarizeArticleHindiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateAndSummarizeArticleHindiPrompt',
  input: {
    schema: TranslateAndSummarizeArticleHindiInputSchema,
  },
  output: {
    schema: TranslateAndSummarizeArticleHindiOutputSchema,
  },
  model: 'googleai/gemini-2.5-flash-lite',
  prompt: `You are an expert translator and summarizer specializing in Hindi news for UPSC (Union Public Service Commission) preparation.

  Your task is to translate the given article title and content into Hindi, ensuring the translated content uses simplified vocabulary suitable for UPSC aspirants.
  After translating, generate a concise heading and 2-4 bullet points summarizing the translated article.

  Article Title: {{{articleTitle}}}
  Article Content: {{{articleContent}}}

  Output the translated title and the summary points.
  Ensure the summary points are factually correct and use simplified Hindi vocabulary.

  {{outputFormatInstructions}}
  `,
});

const translateAndSummarizeArticleHindiFlow = ai.defineFlow(
  {
    name: 'translateAndSummarizeArticleHindiFlow',
    inputSchema: TranslateAndSummarizeArticleHindiInputSchema,
    outputSchema: TranslateAndSummarizeArticleHindiOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
