
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a podcast episode from a list of news articles.
 * It orchestrates a multi-step process: first summarizing articles, then generating a script, and finally generating audio.
 *
 * It exports:
 * - `generatePodcastFromArticles`: The main function to generate the podcast.
 * - `GeneratePodcastFromArticlesInput`: The input type for the function.
 * - `GeneratePodcastFromArticlesOutput`: The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import type { Article } from '@/lib/types';
import { summarizeArticlesForPodcast } from './summarize-articles-for-podcast';

const GeneratePodcastFromArticlesInputSchema = z.object({
  articles: z.array(z.any()).describe('An array of article objects to include in the podcast.'),
});
export type GeneratePodcastFromArticlesInput = z.infer<typeof GeneratePodcastFromArticlesInputSchema>;

const GeneratePodcastFromArticlesOutputSchema = z.object({
  audioDataUri: z.string().describe('The podcast audio data URI in WAV format.'),
});
export type GeneratePodcastFromArticlesOutput = z.infer<typeof GeneratePodcastFromArticlesOutputSchema>;

// This is the top-level function that the client will call.
export async function generatePodcastFromArticles(input: GeneratePodcastFromArticlesInput): Promise<GeneratePodcastFromArticlesOutput> {
 try {
    // First, run the summarization flow
    const { articles } = await summarizeArticlesForPodcast({ articles: input.articles });
    // Then, pass the summarized articles to the script and audio generation flow
    return await generatePodcastScriptAndAudioFlow({ articles });
 } catch (error: any) {
    console.error("[AI ACTION Error - Podcast] Top-level flow failed:", error);
    // Pass a clear, user-friendly error message.
    const errorMessage = error.message || 'An unknown error occurred during podcast generation.';
    throw new Error(errorMessage);
  }
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });
    let bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));
    writer.write(pcmData);
    writer.end();
  });
}

// Prompt to generate the dialogue script from high-quality summaries.
const dialoguePrompt = ai.definePrompt({
    name: 'generatePodcastScriptForTtsPrompt',
    model: 'googleai/gemini-2.5-flash-lite',
    input: { schema: z.object({ articleSnippets: z.string() }) },
    output: { format: 'text' },
    prompt: `You are an expert multilingual podcast scriptwriter. Your primary task is to convert the following news article summaries into a natural-sounding, two-person dialogue script.

**CRUCIAL INSTRUCTION: LANGUAGE DETECTION & ADHERENCE**
First, meticulously analyze the provided "News Article Summaries" to determine its primary language (e.g., English, Hindi, etc.).
You **MUST** write the entire dialogue script in that same detected language.

The dialogue should be between "Speaker1" (a knowledgeable and slightly formal expert) and "Speaker2" (an inquisitive and friendly learner). Speaker1 presents the key information from an article, and Speaker2 asks clarifying questions or makes comments to guide the conversation.

**CRITICAL FORMATTING RULE:** The output MUST be a script formatted *exactly* like this, with each line starting with "Speaker1:" or "Speaker2:".
Speaker1: [First line of dialogue in detected language]
Speaker2: [Second line of dialogue in detected language]
...and so on.

Do NOT add any other text, introductions, or explanations. The entire output must be ONLY the dialogue script.

News Article Summaries:
---
{{{articleSnippets}}}
---

Please provide the dialogue script below in the detected language.`
});

// This flow now expects articles that have already been summarized.
const generatePodcastScriptAndAudioFlow = ai.defineFlow({
  name: 'generatePodcastScriptAndAudioFlow', // Renamed for clarity
  inputSchema: z.object({ articles: z.array(z.any()) }),
  outputSchema: GeneratePodcastFromArticlesOutputSchema,
}, async ({ articles }) => {

  // Step 1: Generate the podcast script using the high-quality summaries.
  console.log('[AI Flow - Podcast] Generating dialogue script from summaries...');
  
  const articleSnippets = articles.map(article => {
    // Use the AI-generated summary if available, otherwise fallback to the original summary.
    return `Title: ${article.title}\nSummary: ${article.summary}`;
  }).join('\n\n---\n\n');

  if (!articleSnippets.trim()) {
    throw new Error("Cannot generate script from empty or invalid article content.");
  }

  const { text } = await dialoguePrompt({ articleSnippets });

  if (!text) {
     throw new Error("The AI model returned no text, so a script cannot be created.");
  }

  let script = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('Speaker1:') || line.startsWith('Speaker2:'))
    .join('\n');
  
  if (!script) {
     console.error("AI generated text but it contained no valid dialogue lines. Raw output:", text);
     throw new Error("The AI failed to generate a valid script from the provided articles. The content may be too complex or short.");
  }
  
  console.log('[AI Flow - Podcast] Dialogue script generated successfully.');
  
  // Step 2: Use the generated script to create the TTS audio.
  console.log('[AI Flow - Podcast] Generating multi-speaker TTS...');
  const { media } = await ai.generate({
    model: 'googleai/gemini-2.5-flash-preview-tts',
     config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Speaker1', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Algenib' } } },
              { speaker: 'Speaker2', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achernar' } } },
            ],
          },
        },
      },
    prompt: script,
  });

  if (!media) {
    throw new Error('The Text-to-Speech model did not return any audio data.');
  }
  console.log('[AI Flow - Podcast] TTS audio data received.');


  // 3. Convert PCM audio to WAV format.
  const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
  const wavBase64 = await toWav(audioBuffer);
  console.log('[AI Flow - Podcast] Audio converted to WAV successfully.');

  return {
    audioDataUri: `data:audio/wav;base64,${wavBase64}`,
  };
});
