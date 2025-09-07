
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
  heading: z.string().describe('A concise, engaging heading for the article, suitable for a news feed.'),
  important_points: z
    .array(z.string())
    .describe('An array of 2-3 crucial bullet points summarizing the article.'),
});

export type SummarizeArticleOutput = z.infer<typeof SummarizeArticleOutputSchema>;

export async function summarizeArticle(input: SummarizeArticleInput): Promise<SummarizeArticleOutput> {
  return summarizeArticleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeArticlePrompt',
  input: {schema: SummarizeArticleInputSchema},
  output: {schema: SummarizeArticleOutputSchema},
  model: 'googleai/gemini-2.5-flash-lite',
  prompt: `You are an expert news summarizer. Your goal is to provide a concise, easy-to-read summary of a news article.

The output must be in a specific JSON format. It must include an engaging 'heading' for the article and a list of 2-3 'important_points'.

- The 'heading' should be a concise and catchy title for the news feed.
- The 'important_points' should be an array of 2 to 3 strings, each representing a key takeaway from the article.

Article Title: {{{title}}}
Article Text: {{{full_text}}}

Please provide the summary in the specified JSON format.
`,
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
