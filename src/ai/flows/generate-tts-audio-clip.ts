'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating TTS audio clips from article headlines and key points.
 *
 * It exports:
 * - `generateTTSAudioClip`: The main function to generate TTS audio clips.
 * - `GenerateTTSAudioClipInput`: The input type for the generateTTSAudioClip function.
 * - `GenerateTTSAudioClipOutput`: The output type for the generateTTSAudioClip function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GenerateTTSAudioClipInputSchema = z.object({
  title: z.string().describe('The title of the news article.'),
  importantPoints: z.array(z.string()).describe('An array of key points from the article.'),
  language: z.enum(['en-IN', 'hi-IN']).describe('The language for TTS generation (en-IN or hi-IN).'),
});
export type GenerateTTSAudioClipInput = z.infer<typeof GenerateTTSAudioClipInputSchema>;

const GenerateTTSAudioClipOutputSchema = z.object({
  audioDataUri: z.string().describe('The audio data URI in WAV format.'),
});
export type GenerateTTSAudioClipOutput = z.infer<typeof GenerateTTSAudioClipOutputSchema>;

export async function generateTTSAudioClip(input: GenerateTTSAudioClipInput): Promise<GenerateTTSAudioClipOutput> {
  return generateTTSAudioClipFlow(input);
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

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const generateTTSAudioClipFlow = ai.defineFlow({
    name: 'generateTTSAudioClipFlow',
    inputSchema: GenerateTTSAudioClipInputSchema,
    outputSchema: GenerateTTSAudioClipOutputSchema,
  },async (input) => {
    const {
      title,
      importantPoints,
      language,
    } = input;

    // Construct the prompt for TTS, now it can be a single description or multiple points
    const contentToRead = importantPoints.join(' ');
    const promptText = `${title}. ${contentToRead}`;

    const {
      media
    } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: language === 'en-IN' ? 'Algenib' : 'Ek Balayan',
            },
          },
        },
      },
      prompt: promptText,
    });

    if (!media) {
      throw new Error('No media returned from TTS generation.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    return {
      audioDataUri: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);
