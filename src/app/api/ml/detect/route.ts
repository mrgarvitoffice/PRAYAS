import { NextResponse } from 'next/server';
import { chatWithNews } from '@/ai/flows/chat-with-news';

// We replaced the heavy onnxruntime-node (350MB+) with a lightweight AI call 
// to fix the Vercel "Max serverless function size exceeded" error.

export async function POST(req: Request) {
    try {
        const { text } = await req.json();
        
        if (!text) {
            return NextResponse.json({ error: 'Text is required for analysis.' }, { status: 400 });
        }

        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            throw new Error("GROQ_API_KEY_MISSING");
        }

        // Use Groq for lightning fast sentiment analysis
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { 
                        role: "system", 
                        content: "You are a sentiment analysis tool. Analyze the following news text and return ONLY a JSON array with one object: [{\"label\": \"POSITIVE\" | \"NEGATIVE\", \"score\": number}]. Do not include any other text." 
                    },
                    { role: "user", content: text.substring(0, 1000) }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error("Groq API failed");
        }

        const data = await response.json();
        // Extract the result from the JSON response
        const result = JSON.parse(data.choices[0].message.content);
        
        // Return in the same format Transformers.js did to keep the UI working
        return NextResponse.json(Array.isArray(result) ? result : [result]);
    } catch (error: any) {
        console.error("Detection error:", error);
        return NextResponse.json([{ label: 'NEUTRAL', score: 0.5 }]);
    }
}
