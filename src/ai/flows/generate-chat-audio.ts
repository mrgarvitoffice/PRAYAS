'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/googleai';

const GenerateChatAudioInputSchema = z.object({
  text: z.string().describe('The AI response text to synthesize.'),
  language: z.string().describe('The language for the audio narration.'),
});
export type GenerateChatAudioInput = z.infer<typeof GenerateChatAudioInputSchema>;

const GenerateChatAudioOutputSchema = z.object({
  audioDataUri: z.string().describe("The generated audio as a base64-encoded data URI."),
});
export type GenerateChatAudioOutput = z.infer<typeof GenerateChatAudioOutputSchema>;

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

const generateChatAudioFlow = ai.defineFlow({
  name: 'generateChatAudioFlow',
  inputSchema: GenerateChatAudioInputSchema,
  outputSchema: GenerateChatAudioOutputSchema,
}, async ({ text, language }) => {
  if (!text || !text.trim()) {
    throw new Error('Cannot generate audio from empty text.');
  }

  // Use a highly natural female voice. Aditi for Hindi/Indian, Aoede for English
  const voice = language === 'hi' ? 'Aditi' : 'Aoede';

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
      prompt: text,
    });

    if (!media || !media.url) {
        throw new Error('Audio generation failed.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);
    
    return {
        audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
});

export async function generateChatAudio(input: GenerateChatAudioInput): Promise<GenerateChatAudioOutput> {
    try {
        return await generateChatAudioFlow(input);
    } catch(error: any) {
        throw new Error('TTS generation failed');
    }
}
