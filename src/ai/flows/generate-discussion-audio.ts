'use server';
/**
 * @fileoverview Generates a two-person dialogue script using Groq (Llama-3.3).
 * Groq is used here because it is fast and has no strict daily quota limits,
 * unlike the Gemini free tier which caps at 20 requests/day.
 */

import { z } from 'zod';

const GenerateDiscussionAudioInputSchema = z.object({
  articles: z.array(z.object({
      title: z.string(),
      content: z.string(),
  })).describe('An array of article objects to include in the discussion.'),
  language: z.string().describe('The language for the discussion script.'),
});
export type GenerateDiscussionAudioInput = z.infer<typeof GenerateDiscussionAudioInputSchema>;

const GenerateDiscussionAudioOutputSchema = z.object({
  discussionScript: z.string().describe('The generated two-person discussion script.'),
});
export type GenerateDiscussionAudioOutput = z.infer<typeof GenerateDiscussionAudioOutputSchema>;

export async function generateDiscussionAudio(input: GenerateDiscussionAudioInput): Promise<GenerateDiscussionAudioOutput> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error('GROQ_API_KEY is not configured.');

  const { articles, language } = input;

  const combinedSummaries = articles
    .map(a => `Topic: ${a.title}\nSummary: ${a.content}`)
    .join('\n\n---\n\n');

  if (!combinedSummaries.trim()) {
    throw new Error('Cannot generate script from empty article content.');
  }

  const systemPrompt = `You are an expert multilingual podcast scriptwriter for UPSC aspirants. Convert the provided news summaries into a clear, engaging two-person dialogue script.

LANGUAGE: Write the ENTIRE script in: ${language === 'hi' ? 'Hindi' : language === 'ja' ? 'Japanese' : language === 'de' ? 'German' : language === 'fr' ? 'French' : language === 'ta' ? 'Tamil' : 'English'}.

SPEAKERS:
- Speaker1: A knowledgeable, slightly formal expert who explains topics and connects them to UPSC syllabus.
- Speaker2: An inquisitive analytical student who asks clarifying questions and summarizes key takeaways.

CRITICAL FORMATTING RULE: Output ONLY the script. Every line must start with exactly "Speaker1:" or "Speaker2:". No other text, headers, or explanations.

Example format:
Speaker1: [dialogue line]
Speaker2: [dialogue line]`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a podcast discussion script for the following news:\n\n${combinedSummaries}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq Discussion Error:', errText);
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText: string = data.choices[0].message.content;

    // Clean and validate the script
    let script = rawText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith('Speaker1:') || line.startsWith('Speaker2:'))
      .join('\n');

    if (!script) {
      // Fallback: if model didn't follow format exactly, use raw text
      script = rawText.trim();
    }

    // Enforce hard character limit to prevent TTS token errors
    const MAX_SCRIPT_LENGTH = 4000;
    if (script.length > MAX_SCRIPT_LENGTH) {
      script = script.substring(0, MAX_SCRIPT_LENGTH);
      const lastNewline = script.lastIndexOf('\n');
      if (lastNewline > 0) script = script.substring(0, lastNewline);
    }

    return { discussionScript: script };

  } catch (error: any) {
    console.error('[Discussion Script] Groq flow failed:', error);
    throw new Error(error.message || 'Failed to generate discussion script.');
  }
}
