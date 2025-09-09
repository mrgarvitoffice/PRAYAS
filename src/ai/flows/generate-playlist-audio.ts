
'use server';
/**
 * @fileoverview Defines a Genkit flow that generates a single audio file from a playlist of articles.
 *
 * Exports:
 * - generatePlaylistAudio: The main function to handle the audio generation.
 * - GeneratePlaylistAudioInput: The Zod schema for the function's input.
 * - GeneratePlaylistAudioOutput: The Zod schema for the function's output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/googleai';

const GeneratePlaylistAudioInputSchema = z.object({
  articles: z.array(z.object({
      title: z.string(),
      content: z.string(),
  })).describe('An array of article objects to include in the audio playlist.'),
  language: z.enum(['en', 'hi']).describe('The language for the audio narration.'),
});
export type GeneratePlaylistAudioInput = z.infer<typeof GeneratePlaylistAudioInputSchema>;


const GeneratePlaylistAudioOutputSchema = z.object({
  audioDataUri: z.string().describe("The generated audio as a base64-encoded data URI."),
});
export type GeneratePlaylistAudioOutput = z.infer<typeof GeneratePlaylistAudioOutputSchema>;


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

    const bufs: any[] = [];
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

const generatePlaylistAudioFlow = ai.defineFlow({
  name: 'generatePlaylistAudioFlow',
  inputSchema: GeneratePlaylistAudioInputSchema,
  outputSchema: GeneratePlaylistAudioOutputSchema,
}, async ({ articles, language }) => {
  if (!articles || articles.length === 0) {
    throw new Error('Cannot generate audio from an empty list of articles.');
  }

  const separator = language === 'hi' ? 'अगला समाचार।' : 'Next story.';
  const fullScript = articles
    .map(article => `${article.title}. ${article.content}`)
    .join(`\n\n${separator}\n\n`);

  const voice = language === 'hi' ? 'Aditi' : 'Algenib';

  console.log(`[AI Flow - Playlist TTS] Generating audio with voice: ${voice}`);

  const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
      prompt: fullScript,
    });

    if (!media || !media.url) {
        throw new Error('Audio generation failed, no media was returned from the AI model.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);

    console.log('[AI Flow - Playlist TTS] Audio generated and converted to WAV successfully.');
    
    return {
        audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
});

export async function generatePlaylistAudio(input: GeneratePlaylistAudioInput): Promise<GeneratePlaylistAudioOutput> {
    try {
        return await generatePlaylistAudioFlow(input);
    } catch(error: any) {
        console.error('[AI Action Error - Playlist Audio] Flow failed:', error);
        let errorMessage = "An unexpected error occurred while generating the audio playlist.";
        if (error instanceof Error) {
            if (error.message.includes('429')) {
                errorMessage = 'You have exceeded the daily limit for audio generation. Please try again tomorrow.';
            } else if (error.message.includes('400')) {
                errorMessage = 'The request was invalid, possibly due to text that is too long or contains unsupported characters. Please try again with fewer articles.'
            }
             else {
                errorMessage = error.message;
            }
        }
        throw new Error(errorMessage);
    }
}
