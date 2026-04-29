import { NextResponse } from 'next/server';

// Replaced local @huggingface/transformers (354 MB onnxruntime-node) with Groq API.
// This reduces the serverless function size from ~400MB to <5MB, fixing Vercel deployment.
export async function POST(req: Request) {
    try {
        const { text } = await req.json();
        
        if (!text) {
            return NextResponse.json({ error: 'Text is required for analysis.' }, { status: 400 });
        }

        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            return NextResponse.json({ error: 'GROQ_API_KEY is not configured.' }, { status: 500 });
        }

        const truncatedText = text.substring(0, 1200);

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `You are a sentiment analysis API. Analyze the sentiment of the given news text.
Respond ONLY with a valid JSON object in this exact format (no other text):
{"label": "POSITIVE" | "NEGATIVE" | "NEUTRAL", "score": <float between 0 and 1>}
Where score represents the confidence level.`
                    },
                    {
                        role: "user",
                        content: truncatedText
                    }
                ],
                temperature: 0.1,
                max_tokens: 60,
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.statusText}`);
        }

        const data = await response.json();
        const rawContent = data.choices[0].message.content.trim();
        
        // Parse the JSON response from Groq
        const parsed = JSON.parse(rawContent);
        
        // Return in the same format as the old HuggingFace pipeline for UI compatibility
        return NextResponse.json([{ label: parsed.label, score: parsed.score }]);

    } catch (error: any) {
        console.error("ML processing error:", error);
        return NextResponse.json({ error: error.message || 'Failed to process ML detection' }, { status: 500 });
    }
}
