'use server';

import { z } from 'zod';

const ChatWithNewsInputSchema = z.object({
  userMessage: z.string().describe('The message or question from the user.'),
  newsContext: z.string().describe('A stringified context of recent news articles to ground the answer.'),
});

export type ChatWithNewsInput = z.infer<typeof ChatWithNewsInputSchema>;

export async function chatWithNews(input: ChatWithNewsInput) {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
        throw new Error("GROQ_API_KEY_MISSING");
    }

    const systemPrompt = `You are a highly intelligent, casual, and slightly witty AI news assistant (inspired by conversational models like Grok). 
Your goal is to answer the user's questions about current affairs based ONLY on the provided news context. 

CRITICAL RULES:
1. Speak the user's language: If they ask in Hindi, reply in casual Hindi. If they use English, reply in English. If they use Hinglish, reply in casual Hinglish!
2. Be conversational and engaging, like a smart friend explaining the news.
3. STRICT LIMIT: Keep your answer incredibly short and concise. NEVER exceed 2 sentences. You are a quick voice assistant, not an essay writer.
4. If the user asks something completely unrelated to the provided news context, politely remind them that you are currently hooked up to today's news feed.

News Context:
${input.newsContext}`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Upgraded to latest fast Llama 3.3 model
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: input.userMessage }
                ],
                temperature: 0.7,
                max_tokens: 500,
            })
        });

        if (!response.ok) {
            console.error("Groq Response Error:", await response.text());
            throw new Error("Groq API request failed.");
        }

        const data = await response.json();
        return {
            answer: data.choices[0].message.content
        };
    } catch (error: any) {
        console.error("Chatbot Error:", error);
        if (error.message === "GROQ_API_KEY_MISSING") throw error;
        return {
            answer: "I apologize, but my LPU servers are currently facing issues! Please try asking your question again."
        };
    }
}
