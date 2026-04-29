
'use server';

/**
 * @fileOverview A Genkit flow to translate an article into Hindi using simplified UPSC-friendly vocabulary
 * and then summarize the translated article (headline + 2-4 key points).
 *
 * - translateAndSummarizeArticleHindi - A function that handles the translation and summarization process.
 * - TranslateAndSummarizeArticleHindiInput - The input type for the translateAndSummarizeArticleHindi function.
 * - TranslateAndSummarizeArticleHindiOutput - The return type for the translateAndSummarizeArticleHindi function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateAndSummarizeArticleHindiInputSchema = z.object({
  articleTitle: z.string().describe('The title of the article to translate and summarize.'),
  articleContent: z.string().describe('The full content of the article to translate.'),
});
export type TranslateAndSummarizeArticleHindiInput = z.infer<typeof TranslateAndSummarizeArticleHindiInputSchema>;

const TranslateAndSummarizeArticleHindiOutputSchema = z.object({
  translatedTitle: z.string().describe('The translated title of the article in Hindi.'),
  summaryPoints: z.array(z.string()).describe('A list of 2-4 key summary points of the translated article in Hindi.'),
});
export type TranslateAndSummarizeArticleHindiOutput = z.infer<typeof TranslateAndSummarizeArticleHindiOutputSchema>;

export async function translateAndSummarizeArticleHindi(
  input: TranslateAndSummarizeArticleHindiInput
): Promise<TranslateAndSummarizeArticleHindiOutput> {
  return translateAndSummarizeArticleHindiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateAndSummarizeArticleHindiPrompt',
  input: {
    schema: TranslateAndSummarizeArticleHindiInputSchema,
  },
  output: {
    schema: TranslateAndSummarizeArticleHindiOutputSchema,
  },
  model: 'googleai/gemini-2.5-flash-lite',
  prompt: `You are an expert translator and summarizer specializing in Hindi news for UPSC (Union Public Service Commission) preparation.

  Your task is to translate the given article title and content into Hindi, ensuring the translated content uses simplified vocabulary suitable for UPSC aspirants.
  After translating, generate a concise heading and 2-4 bullet points summarizing the translated article.

  Article Title: {{{articleTitle}}}
  Article Content: {{{articleContent}}}

  Output the translated title and the summary points.
  Ensure the summary points are factually correct and use simplified Hindi vocabulary.

  {{outputFormatInstructions}}
  `,
});

const translateAndSummarizeArticleHindiFlow = ai.defineFlow(
  {
    name: 'translateAndSummarizeArticleHindiFlow',
    inputSchema: TranslateAndSummarizeArticleHindiInputSchema,
    outputSchema: TranslateAndSummarizeArticleHindiOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) throw new Error("No output from Gemini");
      return output;
    } catch (error) {
      console.error("Gemini translation failed, falling back to free translation API:", error);
      
      // Fallback Google Translate logic
      const fallbackTranslate = async (text: string) => {
        if (!text) return '';
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(text.substring(0, 800))}`;
            const res = await fetch(url);
            const json = await res.json();
            return json[0].map((item: any) => item[0]).join('');
        } catch(e) {
            return text;
        }
      };

      const translatedTitle = await fallbackTranslate(input.articleTitle);
      const translatedContent = await fallbackTranslate(input.articleContent || '');
      
      // Attempt to split content into rudimentary points
      let points = translatedContent.split(/(?<=[।|?|!])\s+/).filter(s => s.trim().length > 10);
      if (points.length === 0) points = [translatedTitle, "विवरण के लिए कृपया पूरा लेख पढ़ें।"];

      return {
        translatedTitle: translatedTitle,
        summaryPoints: points.slice(0, 3)
      };
    }
  }
);
