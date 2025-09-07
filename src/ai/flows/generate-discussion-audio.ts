
'use server';
/**
 * @fileoverview Defines a Genkit flow that generates a two-person dialogue script from article content.
 * It does NOT generate audio, only the text script.
 *
 * Exports:
 * - generateDiscussionAudio: The main function to handle the discussion script generation.
 * - GenerateDiscussionAudioInput: The Zod schema for the function's input.
 * - GenerateDiscussionAudioOutput: The Zod schema for the function's output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateDiscussionAudioInputSchema = z.object({
  articles: z.array(z.object({
      title: z.string(),
      content: z.string(),
  })).describe('An array of article objects to include in the discussion.'),
  language: z.enum(['en', 'hi']).describe('The language for the discussion script.'),
});
export type GenerateDiscussionAudioInput = z.infer<typeof GenerateDiscussionAudioInputSchema>;

const GenerateDiscussionAudioOutputSchema = z.object({
  discussionScript: z.string().describe('The generated two-person discussion script.'),
});
export type GenerateDiscussionAudioOutput = z.infer<typeof GenerateDiscussionAudioOutputSchema>;

export async function generateDiscussionAudio(input: GenerateDiscussionAudioInput): Promise<GenerateDiscussionAudioOutput> {
  try {
    return await generateDiscussionScriptFlow(input);
  } catch (error: any) {
    console.error("[AI Action Error - Discussion Script] Flow failed:", error);
    let errorMessage = "An unexpected error occurred while generating the script.";
    if (error instanceof Error) {
        if (error.message.includes('429')) {
          errorMessage = 'You have exceeded the daily limit for script generation. Please try again tomorrow.';
        } else {
            errorMessage = error.message;
        }
    }
    throw new Error(errorMessage);
  }
}

const dialoguePrompt = ai.definePrompt({
    name: 'generateDiscussionScriptPrompt',
    model: 'googleai/gemini-2.5-flash-lite',
    input: { schema: z.object({ combinedSummaries: z.string(), language: z.string() }) },
    output: { format: 'text' },
    prompt: `You are an expert multilingual podcast scriptwriter for UPSC aspirants. Your primary task is to convert the following collection of news summaries into a clear, concise, and engaging two-person dialogue script.

**CRUCIAL INSTRUCTION: LANGUAGE ADHERENCE**
The user has specified the desired language as: **{{{language}}}**.
You **MUST** write the entire dialogue script in that same language.

The dialogue should be between "Speaker1" (a knowledgeable and slightly formal expert) and "Speaker2" (an inquisitive and analytical student). Speaker1 should introduce and explain the topics, connecting them to relevant UPSC syllabus areas where possible. Speaker2 should ask clarifying questions, probe for deeper analysis, and summarize key takeaways.

**IMPORTANT:** The length and depth of the dialogue must be proportional to the amount of content provided. If there are many summaries, create a longer, more detailed discussion. If there are only a few, keep it brief but insightful. Touch on each of the topics provided.

**CRITICAL FORMATTING RULE:** The output MUST be a script formatted *exactly* like this, with each line starting with "Speaker1:" or "Speaker2:".
Speaker1: [First line of dialogue in specified language]
Speaker2: [Second line of dialogue in specified language]
...and so on.

Do NOT add any other text, introductions, or explanations. The entire output must be ONLY the dialogue script.

News Summaries:
---
{{{combinedSummaries}}}
---

Please provide the dialogue script below in the specified language, ensuring its length and depth reflect the amount of source material and its tone is suitable for UPSC preparation.`
});


const generateDiscussionScriptFlow = ai.defineFlow({
  name: 'generateDiscussionScriptFlow',
  inputSchema: GenerateDiscussionAudioInputSchema,
  outputSchema: GenerateDiscussionAudioOutputSchema,
}, async ({ articles, language }) => {

  const combinedSummaries = articles.map(article => {
    return `Topic: ${article.title}\nSummary: ${article.content}`;
  }).join('\n\n---\n\n');

  if (!combinedSummaries.trim()) {
    throw new Error("Cannot generate script from empty or invalid article content.");
  }

  console.log('[AI Flow - Discussion Script] Generating dialogue script directly from summaries...');

  const { text: dialogue } = await dialoguePrompt({ combinedSummaries, language });

  if (!dialogue) {
     throw new Error("The AI model returned no text, so a script cannot be created.");
  }

  let script = dialogue
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('Speaker1:') || line.startsWith('Speaker2:'))
    .join('\n');

  if (!script) {
     console.error("AI generated text but it contained no valid dialogue lines. Raw output:", dialogue);
     throw new Error("The AI failed to generate a valid script from the provided articles. The content may be too complex or short.");
  }

  // Enforce a hard character limit to prevent TTS token errors
  const MAX_SCRIPT_LENGTH = 4000;
  if (script.length > MAX_SCRIPT_LENGTH) {
    console.warn(`[AI Flow - Discussion Script] Script is too long (${script.length} chars), truncating to ${MAX_SCRIPT_LENGTH}.`);
    script = script.substring(0, MAX_SCRIPT_LENGTH);
    const lastNewline = script.lastIndexOf('\n');
    if (lastNewline > 0) {
      script = script.substring(0, lastNewline);
    }
  }

  console.log('[AI Flow - Discussion Script] Dialogue script generated successfully.');

  return {
    discussionScript: script,
  };
});
