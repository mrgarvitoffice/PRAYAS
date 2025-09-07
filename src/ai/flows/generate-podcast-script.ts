
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a podcast script from a list of articles.
 * It follows a robust pattern with a dedicated prompt for content generation and includes self-healing.
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
  try {
    return await generatePodcastScriptFlow(input);
  } catch (error: any) {
    console.error("[AI ACTION Error - Podcast Script] Flow failed:", error);
    // This makes sure the error message from the prompt/flow is passed to the user.
    throw new Error(`Script generation failed: ${error.message}`);
  }
}

const dialoguePrompt = ai.definePrompt({
    name: 'generatePodcastScriptPrompt',
    model: 'googleai/gemini-2.5-flash-lite',
    input: { schema: z.object({ articleSnippets: z.string(), language: z.string() }) },
    output: { format: 'text' }, // Request raw text for easier cleanup.
    prompt: `You are an expert multilingual podcast scriptwriter. Your task is to convert the following news articles into a natural-sounding, two-person dialogue script.

**CRUCIAL INSTRUCTION: LANGUAGE ADHERENCE**
The user has specified the desired language as: **{{{language}}}**.
You **MUST** write the entire dialogue script in that same language.
- If 'en', write in English.
- If 'hi', write in Hindi.
- If 'bilingual', write a mix of English and Hindi for each segment, starting with an English intro.

The dialogue should be between "Speaker1" (a knowledgeable and slightly formal expert) and "Speaker2" (an inquisitive and friendly learner). Speaker1 presents the key information from an article, and Speaker2 asks clarifying questions or makes comments to guide the conversation and make it more engaging.

**CRITICAL FORMATTING RULE:** The output MUST be a script formatted *exactly* like this, with each line starting with "Speaker1:" or "Speaker2:".
Speaker1: [First line of dialogue in specified language]
Speaker2: [Second line of dialogue in specified language]
...and so on.

Do NOT add any other text, introductions, summaries, or explanations. The entire output should be just the dialogue script.

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
  
  if (!articleSnippets.trim()) {
    throw new Error("Cannot generate script from empty or invalid article content.");
  }

  const { text } = await dialoguePrompt({ articleSnippets, language });
  
  if (!text) {
     throw new Error("The AI model returned no text. The operation cannot proceed.");
  }
  
  // Self-healing: Clean up the script to ensure it only contains valid dialogue lines.
  // This is a more robust way to ensure a clean script.
  const dialogueScript = text
    .split('\n')
    .map(line => line.trim()) // Trim whitespace from each line
    .filter(line => line.startsWith('Speaker1:') || line.startsWith('Speaker2:'))
    .join('\n');

  // Final validation: If after all cleanup, the script is still empty, throw an error.
  if (!dialogueScript) {
    console.error("AI generated text but it contained no valid dialogue lines. Raw output:", text);
    throw new Error("The AI failed to generate a valid script from the provided articles. The content may be too complex or short.");
  }
  
  return { script: dialogueScript };
});
