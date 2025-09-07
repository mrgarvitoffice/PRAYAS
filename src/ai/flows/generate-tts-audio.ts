
'use server';
/**
 * @fileoverview Defines a Genkit flow that generates a downloadable audio file from a script.
 * It uses a two-voice model for discussions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';

const GenerateTtsAudioInputSchema = z.object({
  script: z.string().describe('The discussion script with Speaker1 and Speaker2 labels.'),
  language: z.enum(['en', 'hi']).describe('The language for the audio generation.'),
});
export type GenerateTtsAudioInput = z.infer<typeof GenerateTtsAudioInputSchema>;

const GenerateTtsAudioOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a base64-encoded data URI.'),
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

    let bufs: any[] = [];
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
    console.log(`[AI Flow - TTS Audio] Generating audio for script in ${language}...`);

    // OpenAI voices are generally higher quality and have better language support.
    const langVoices = {
      en: { speaker1: 'Alloy', speaker2: 'Echo' },
      hi: { speaker1: 'Alloy', speaker2: 'Echo' } // Using same voices for Hindi as an example
    };
    const voices = langVoices[language];

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-pro-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Speaker1',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voices.speaker1 } },
              },
              {
                speaker: 'Speaker2',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voices.speaker2 } },
              },
            ],
          },
        },
      },
      prompt: script,
    });

    if (!media) {
      throw new Error('AI model did not return any audio media.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1), 'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);
    
    console.log('[AI Flow - TTS Audio] Audio generated successfully.');
    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
});

export async function generateTtsAudio(input: GenerateTtsAudioInput): Promise<GenerateTtsAudioOutput> {
    try {
        return await generateTtsAudioFlow(input);
    } catch(e: any) {
        console.error('[AI Action Error - TTS Audio] Flow failed:', e);
        let errorMessage = "An unknown error occurred during audio generation.";
         if (e instanceof Error) {
            if (e.message.includes('429')) {
              errorMessage = 'You have exceeded the daily limit for audio generation. Please try again tomorrow.';
            } else {
                errorMessage = e.message;
            }
        }
        throw new Error(errorMessage);
    }
}
