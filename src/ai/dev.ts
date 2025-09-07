
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-article.ts';
import '@/ai/flows/translate-and-summarize-article-hindi.ts';
import '@/ai/flows/generate-podcast-from-articles.ts';
import '@/ai/flows/generate-discussion-audio.ts';
import '@/ai/flows/summarize-articles-for-podcast.ts';
