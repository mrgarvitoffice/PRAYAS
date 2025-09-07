
'use server';
/**
 * @fileoverview Defines a Genkit flow that converts text into single-speaker audio.
 * It uses a standard text-to-speech model to generate a WAV audio file.
 *
 * Exports:
 * - generateSingleSpeakerAudio: The main function to handle the audio generation process.
 * - GenerateSingleSpeakerAudioInput: The Zod schema for the function's input.
 * - GenerateSingleSpeakerAudioOutput: The Zod schema for the function's output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';

const GenerateSingleSpeakerAudioInputSchema = z.object({
  content: z.string().describe('The content to be turned into audio.'),
  language: z.enum(['en', 'hi']).describe('The language for the audio.'),
});
export type GenerateSingleSpeakerAudioInput = z.infer<typeof GenerateSingleSpeakerAudioInputSchema>;

const GenerateSingleSpeakerAudioOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI.'),
});
export type GenerateSingleSpeakerAudioOutput = z.infer<typeof GenerateSingleSpeakerAudioOutputSchema>;


export async function generateSingleSpeakerAudio(input: GenerateSingleSpeakerAudioInput): Promise<GenerateSingleSpeakerAudioOutput> {
  return generateSingleSpeakerAudioFlow(input);
}


async function toWav(pcmData: Buffer, channels = 1, rate = 24000, sampleWidth = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({ channels, sampleRate: rate, bitDepth: sampleWidth * 8 });
    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));
    writer.write(pcmData);
    writer.end();
  });
}

const generateSingleSpeakerAudioFlow = ai.defineFlow(
  {
    name: 'generateSingleSpeakerAudioFlow',
    inputSchema: GenerateSingleSpeakerAudioInputSchema,
    outputSchema: GenerateSingleSpeakerAudioOutputSchema,
  },
  async ({ content, language }) => {
    console.log(`[AI Flow - Single Speaker Audio] Generating TTS for language: ${language}`);
    
    // Voice selection can be customized here if needed
    const voiceName = language === 'hi' ? 'Achernar' : 'Algenib';

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
           voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
           }
        },
      },
      prompt: content,
    });

    if (!media) {
      throw new Error('TTS model did not return any media.');
    }
    console.log('[AI Flow - Single Speaker Audio] TTS audio data received.');

    const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    const wavBase64 = await toWav(audioBuffer);
    console.log('[AI Flow - Single Speaker Audio] Audio converted to WAV successfully.');

    return {
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);
