
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

const dialoguePrompt = ai.definePrompt({
    name: 'generateDialogueForTtsPrompt',
    model: 'googleai/gemini-2.5-flash-lite',
    input: { schema: z.object({ articleSnippets: z.string(), language: z.string() }) },
    output: { format: 'text' }, // Request raw text for easier cleanup.
    prompt: `You are an expert multilingual podcast scriptwriter. Your task is to convert the following news articles into a natural-sounding, two-person dialogue script.

**CRUCIAL INSTRUCTION: LANGUAGE ADHERENCE**
The user has specified the desired language as: **{{{language}}}**.
You **MUST** write the entire dialogue script in that same language.
- If 'en', write in English.
- If 'hi', write in Hindi.
- If 'bilingual', write a mix of English and Hindi for each segment.

The dialogue should be between "Narrator" (a professional news anchor) and "Speaker1" (a knowledgeable correspondent). The Narrator provides introductions and transitions, while Speaker1 delivers the core news details.

**CRITICAL FORMATTING RULE:** The output MUST be a script formatted *exactly* like this, with each line starting with "Narrator:" or "Speaker1:".
Narrator: [Introductory line in specified language]
Speaker1: [First news item in specified language]
...and so on.

Do NOT add any other text, introductions, or summaries. The entire output should be just the dialogue script.

News Articles to Convert:
---
{{{articleSnippets}}}
---

Please provide the dialogue script below in the specified language.`
});

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

  const llmResponse = await dialoguePrompt({ articleSnippets, language });
  let dialogueScript = llmResponse.text.trim();
  
  // Self-healing: Clean up the script to ensure it only contains valid dialogue lines.
  dialogueScript = dialogueScript
    .split('\n')
    .filter(line => line.startsWith('Narrator:') || line.startsWith('Speaker1:'))
    .join('\n');

  if (!dialogueScript) {
    console.error("Podcast script generation failed, AI returned no valid script lines.");
    return { script: '' };
  }
  
  return { script: dialogueScript };
});
