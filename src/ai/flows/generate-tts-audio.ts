
'use server';
/**
 * @fileoverview Defines a Genkit flow that generates a downloadable two-person audio file from a script.
 *
 * Exports:
 * - generateTtsAudio: The main function to handle the audio generation.
 * - GenerateTtsAudioInput: The Zod schema for the function's input.
 * - GenerateTtsAudioOutput: The Zod schema for the function's output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/googleai';


const GenerateTtsAudioInputSchema = z.object({
  script: z.string().describe('The discussion script with Speaker1 and Speaker2 labels.'),
  language: z.enum(['en', 'hi']).describe('The language of the script.'),
});
export type GenerateTtsAudioInput = z.infer<typeof GenerateTtsAudioInputSchema>;


const GenerateTtsAudioOutputSchema = z.object({
  audioDataUri: z.string().describe("The generated audio as a base64-encoded data URI."),
});
export type GenerateTtsAudioOutput = z.infer<typeof GenerateTtsAudioOutputSchema>;


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

const generateTtsAudioFlow = ai.defineFlow({
  name: 'generateTtsAudioFlow',
  inputSchema: GenerateTtsAudioInputSchema,
  outputSchema: GenerateTtsAudioOutputSchema,
}, async ({ script, language }) => {
  if (!script.trim()) {
    throw new Error('Cannot generate audio from an empty script.');
  }

  const voice1 = language === 'hi' ? 'Salil' : 'Algenib';
  const voice2 = language === 'hi' ? 'Aditi' : 'Achernar';

  console.log(`[AI Flow - TTS] Generating audio with voices: ${voice1}, ${voice2}`);

  const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Speaker1',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice1 },
                },
              },
              {
                speaker: 'Speaker2',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice2 },
                },
              },
            ],
          },
        },
      },
      prompt: script,
    });

    if (!media || !media.url) {
        throw new Error('Audio generation failed, no media was returned from the AI model.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);

    console.log('[AI Flow - TTS] Audio generated and converted to WAV successfully.');
    
    return {
        audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
});

export async function generateTtsAudio(input: GenerateTtsAudioInput): Promise<GenerateTtsAudioOutput> {
    try {
        return await generateTtsAudioFlow(input);
    } catch(error: any) {
        console.error('[AI Action Error - TTS Audio] Flow failed:', error);
        let errorMessage = "An unexpected error occurred while generating the audio.";
        if (error instanceof Error) {
            if (error.message.includes('429')) {
                errorMessage = 'You have exceeded the daily limit for audio generation. Please try again tomorrow.';
            } else if (error.message.includes('400')) {
                errorMessage = 'The request was invalid, possibly due to a script that is too long or contains unsupported characters. Please try again with different articles.'
            }
             else {
                errorMessage = error.message;
            }
        }
        throw new Error(errorMessage);
    }
}
