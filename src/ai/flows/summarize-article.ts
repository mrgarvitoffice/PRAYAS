
'use server';

/**
 * @fileOverview A news article summarization AI agent.
 *
 * - summarizeArticle - A function that handles the article summarization process.
 * - SummarizeArticleInput - The input type for the summarizeArticle function.
 * - SummarizeArticleOutput - The return type for the summarizeArticle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeArticleInputSchema = z.object({
  title: z.string().describe('The title of the article.'),
  full_text: z.string().describe('The full text content of the article.'),
});

export type SummarizeArticleInput = z.infer<typeof SummarizeArticleInputSchema>;

const SummarizeArticleOutputSchema = z.object({
  heading: z.string().describe('A concise heading for the article.'),
  important_points: z
    .array(z.string())
    .describe('An array of 2-4 crucial points from the article.'),
});

export type SummarizeArticleOutput = z.infer<typeof SummarizeArticleOutputSchema>;

export async function summarizeArticle(input: SummarizeArticleInput): Promise<SummarizeArticleOutput> {
  return summarizeArticleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeArticlePrompt',
  input: {schema: SummarizeArticleInputSchema},
  output: {schema: SummarizeArticleOutputSchema},
  model: 'googleai/gemini-2.5-flash-preview-05-20',
  prompt: `You are an expert news summarizer.

  Your goal is to provide a concise summary of a news article.
  The summary should include a heading and 2-4 key bullet points.

  Article Title: {{{title}}}
  Article Text: {{{full_text}}}

  Summary format:
  {
    heading: string,
    important_points: string[]
  }`,
});

const summarizeArticleFlow = ai.defineFlow(
  {
    name: 'summarizeArticleFlow',
    inputSchema: SummarizeArticleInputSchema,
    outputSchema: SummarizeArticleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
