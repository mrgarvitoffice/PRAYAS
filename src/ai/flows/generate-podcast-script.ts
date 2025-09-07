
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a podcast script from a list of articles.
 *
 * It exports:
 * - `generatePodcastScript`: The main function to generate the script.
 * - `GeneratePodcastScriptInput`: The input type for the function.
 * - `GeneratePodcastScriptOutput`: The output type for the function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Article } from '@/lib/types';

const GeneratePodcastScriptInputSchema = z.object({
  articles: z.array(z.any()).describe('An array of article objects to include in the podcast script.'),
  language: z.enum(['en', 'hi', 'bilingual']).describe('The language for the podcast script.'),
});
export type GeneratePodcastScriptInput = z.infer<typeof GeneratePodcastScriptInputSchema>;

const GeneratePodcastScriptOutputSchema = z.object({
  script: z.string().describe('The fully generated podcast script with speaker tags.'),
});
export type GeneratePodcastScriptOutput = z.infer<typeof GeneratePodcastScriptOutputSchema>;

export async function generatePodcastScript(input: GeneratePodcastScriptInput): Promise<GeneratePodcastScriptOutput> {
  return generatePodcastScriptFlow(input);
}

const generatePodcastScriptFlow = ai.defineFlow({
  name: 'generatePodcastScriptFlow',
  inputSchema: GeneratePodcastScriptInputSchema,
  outputSchema: GeneratePodcastScriptOutputSchema,
}, async ({ articles, language }) => {

  const getArticleContent = (article: Article) => {
    // Use important points if available, otherwise fallback to the summary.
    const englishSummaryContent = (article.importantPoints && article.importantPoints.length > 0)
        ? article.importantPoints.join('. ')
        : article.summary;
    const hindiSummaryContent = (article.importantPointsHi && article.importantPointsHi.length > 0)
        ? article.importantPointsHi.join('. ')
        : article.summaryHi;

    const englishContent = `Title: ${article.title}. Summary: ${englishSummaryContent}`;
    const hindiContent = `Title: ${article.titleHi}. Summary: ${hindiSummaryContent}`;
    
    if (language === 'en') return englishContent;
    if (language === 'hi') return hindiContent;
    // Bilingual
    return `English Version: ${englishContent}. Now in Hindi: ${hindiContent}`;
  };

  const articleSnippets = articles.map(article => {
    const source = article.source?.name || 'an unknown source';
    const content = getArticleContent(article);
    return `Source: ${source}\nContent: ${content}`;
  }).join('\n\n---\n\n');

  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash-preview-05-20',
    prompt: `You are a podcast script writer. Create a compelling podcast script from the following news articles.

    Instructions:
    1.  Start with a friendly intro: "Narrator: Welcome to your AI news podcast. Here are today's top stories."
    2.  For each article, create a segment.
    3.  Introduce each segment with "Narrator: Next up, from [Source Name]."
    4.  The headline should be read by "Speaker1". Format: "Speaker1: [Article Title]."
    5.  The summary should be read by the "Narrator". Format: "Narrator: [Article Summary]."
    6.  If the language is bilingual, the Hindi part should follow the English part for each article.
    7.  Create smooth, natural transitions.
    8.  End with a concluding line like "Narrator: That's all for today's briefing. Thanks for listening."

    Articles:
    ${articleSnippets}
    `,
  });

  if (!output || !output.text) {
    console.error("Podcast script generation failed, AI returned no output.");
    return { script: '' };
  }
  
  return { script: output.text };
});
