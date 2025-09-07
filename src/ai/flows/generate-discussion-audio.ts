'use server';
/**
 * @fileoverview Defines a Genkit flow that converts text into a multi-speaker audio discussion.
 * This flow first generates a two-person dialogue script from the input content,
 * then uses a text-to-speech model to generate a multi-speaker audio file.
 * It is designed to automatically detect and adhere to the language of the source content.
 *
 * Exports:
 * - generateDiscussionAudio: The main function to handle the discussion generation process.
 * - GenerateDiscussionAudioInput: The Zod schema for the function's input.
 * - GenerateDiscussionAudioOutput: The Zod schema for the function's output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';

const GenerateDiscussionAudioInputSchema = z.object({
  content: z.string().describe('The content to be turned into a discussion.'),
  language: z.enum(['en', 'hi']).describe('The language for the discussion.'),
});
export type GenerateDiscussionAudioInput = z.infer<typeof GenerateDiscussionAudioInputSchema>;

const GenerateDiscussionAudioOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio discussion as a data URI.'),
});
export type GenerateDiscussionAudioOutput = z.infer<typeof GenerateDiscussionAudioOutputSchema>;

export async function generateDiscussionAudio(input: GenerateDiscussionAudioInput): Promise<GenerateDiscussionAudioOutput> {
  try {
    return await generateDiscussionAudioFlow(input);
  } catch (error: any) {
    console.error("[AI Action Error - Discussion Audio] Flow failed:", error);
    let errorMessage = error.message || "An unexpected error occurred.";
    if (errorMessage.toLowerCase().includes("dialogue script")) {
      errorMessage = "The AI failed to create a discussion script from the provided text. This can sometimes happen with very short or complex content. Please try rephrasing or using a longer text.";
    } else if (errorMessage.includes('429')) {
      errorMessage = 'You have exceeded the daily limit for audio generation. Please try again tomorrow.';
    }
    throw new Error(`Failed to generate discussion audio. Error: ${errorMessage}`);
  }
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

const dialoguePrompt = ai.definePrompt({
    name: 'generateDialogueForTtsPrompt',
    model: 'googleai/gemini-2.5-flash-lite',
    input: { schema: z.object({ content: z.string(), language: z.string() }) },
    output: { format: 'text' },
    prompt: `You are an expert multilingual scriptwriter. Your task is to convert the following text content into a natural-sounding, two-person dialogue script.

**CRUCIAL INSTRUCTION: LANGUAGE ADHERENCE**
The user has specified the desired language as: **{{{language}}}**.
You **MUST** write the entire dialogue script in that same language.

The dialogue should be between "Speaker1" (a knowledgeable and slightly formal expert) and "Speaker2" (an inquisitive and friendly learner). It should discuss and explain the key points from the provided content. Speaker1 should present the information, and Speaker2 should ask clarifying questions or make comments to guide the conversation.

**CRITICAL FORMATTING RULE:** The output MUST be a script formatted *exactly* like this, with each line starting with "Speaker1:" or "Speaker2:".
Speaker1: [First line of dialogue in detected language]
Speaker2: [Second line of dialogue in detected language]
...and so on.

Do NOT add any other text, introductions, or summaries. The entire output should be just the dialogue script.

Content to convert:
---
{{{content}}}
---

Please provide the dialogue script below in the specified language.`
});

const generateDiscussionAudioFlow = ai.defineFlow(
  {
    name: 'generateDiscussionAudioFlow',
    inputSchema: GenerateDiscussionAudioInputSchema,
    outputSchema: GenerateDiscussionAudioOutputSchema,
  },
  async ({ content, language }) => {
    console.log('[AI Flow - Discussion Audio] Generating dialogue script...');
    const llmResponse = await dialoguePrompt({ content, language });
    let dialogueScript = llmResponse.text.trim();

    dialogueScript = dialogueScript
      .split('\n')
      .filter(line => line.startsWith('Speaker1:') || line.startsWith('Speaker2:'))
      .join('\n');

    if (!dialogueScript) {
      throw new Error("Failed to generate a valid dialogue script from the content.");
    }
    console.log('[AI Flow - Discussion Audio] Dialogue script generated and cleaned successfully.');

    console.log('[AI Flow - Discussion Audio] Generating multi-speaker TTS...');
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
      prompt: dialogueScript,
    });

    if (!media) {
      throw new Error('TTS model did not return any media.');
    }
    console.log('[AI Flow - Discussion Audio] TTS audio data received.');

    const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    const wavBase64 = await toWav(audioBuffer);
    console.log('[AI Flow - Discussion Audio] Audio converted to WAV successfully.');

    return {
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);
