
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a podcast episode from a list of news articles.
 *
 * It exports:
 * - `generatePodcastFromArticles`: The main function to generate the podcast.
 * - `GeneratePodcastFromArticlesInput`: The input type for the function.
 * - `GeneratePodcastFromArticlesOutput`: The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import type {Article} from '@/lib/types';

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
  return generatePodcastFromArticlesFlow(input);
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
  
  const getArticleScript = (article: Article, lang: 'en' | 'hi') => {
    const title = lang === 'en' ? article.title : article.titleHi;
    const summary = lang === 'en' ? (article.importantPoints.join('. ') || article.summary) : (article.importantPointsHi.join('. ') || article.summaryHi) ;
    return `Narrator: Next up, from ${article.source.name}. Headline: Speaker1: ${title}. Narrator: ${summary}`;
  };

  let podcastScript = articles.map(article => {
    if (language === 'bilingual') {
      return `${getArticleScript(article, 'en')} ${getArticleScript(article, 'hi')}`;
    }
    return getArticleScript(article, language as 'en' | 'hi');
  }).join('\n');

  const fullScript = `Narrator: Welcome to your AI news podcast. Here are today's top stories. ${podcastScript}`;

  const { media } = await ai.generate({
    model: 'googleai/gemini-2.5-flash-preview-tts',
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Narrator', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Alloy' } } },
            { speaker: 'Speaker1', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Echo' } } },
          ],
        },
      },
    },
    prompt: fullScript,
  });

  if (!media) {
    throw new Error('No media returned from TTS generation.');
  }

  const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
  return {
    audioDataUri: `data:audio/wav;base64,${await toWav(audioBuffer)}`,
  };
});

    