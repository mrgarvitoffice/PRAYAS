
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a podcast episode from a list of news articles.
 * It orchestrates a two-step process: first generating a script, then generating audio.
 *
 * It exports:
 * - `generatePodcastFromArticles`: The main function to generate the podcast.
 * - `GeneratePodcastFromArticlesInput`: The input type for the function.
 * - `GeneratePodcastFromArticlesOutput`: The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import { generatePodcastScript } from './generate-podcast-script';
import type { Article } from '@/lib/types';

const GeneratePodcastFromArticlesInputSchema = z.object({
  articles: z.array(z.any()).describe('An array of article objects to include in the podcast.'),
  language: z.enum(['en', 'hi', 'bilingual']).describe('The language for podcast generation.'),
});
export type GeneratePodcastFromArticlesInput = z.infer<typeof GeneratePodcastFromArticlesInputSchema>;

const GeneratePodcastFromArticlesOutputSchema = z.object({
  audioDataUri: z.string().describe('The podcast audio data URI in WAV format.'),
});
export type GeneratePodcastFromArticlesOutput = z.infer<typeof GeneratePodcastFromArticlesOutputSchema>;

export async function generatePodcastFromArticles(input: GeneratePodcastFromArticlesInput): Promise<GeneratePodcastFromArticlesOutput> {
 try {
    return await generatePodcastFromArticlesFlow(input);
 } catch (error: any) {
    console.error("[AI ACTION Error - Podcast] Flow failed:", error);
    const errorMessage = error.message || "An unexpected error occurred.";
    if (errorMessage.toLowerCase().includes("script")) {
      throw new Error("The AI failed to create a podcast script from the provided articles. This can sometimes happen if the content is too short or complex.");
    }
    throw new Error(`Failed to generate podcast audio. Error: ${errorMessage}`);
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

const generatePodcastFromArticlesFlow = ai.defineFlow({
  name: 'generatePodcastFromArticlesFlow',
  inputSchema: GeneratePodcastFromArticlesInputSchema,
  outputSchema: GeneratePodcastFromArticlesOutputSchema,
}, async ({ articles, language }) => {
  
  // Step 1: Generate the podcast script using the dedicated, robust flow.
  console.log('[AI Flow - Podcast] Generating dialogue script...');
  const { script } = await generatePodcastScript({ articles, language });
  
  // Prevent calling TTS with an empty script. The script generation flow will throw an error if it fails.
  if (!script) {
     throw new Error("The podcast script generation returned an empty script.");
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
              { speaker: 'Narrator', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achernar' } } }, // Female
              { speaker: 'Speaker1', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Algenib' } } }, // Male
            ],
          },
        },
      },
    prompt: script,
  });

  if (!media) {
    throw new Error('TTS model did not return any media.');
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
