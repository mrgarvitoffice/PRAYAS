import { NextResponse } from 'next/server';

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
                        content: "Analyze the following news text. Return ONLY a JSON array with one object like this: [{\"label\": \"POSITIVE\", \"score\": 0.95}]. Use labels POSITIVE or NEGATIVE." 
                    },
                    { role: "user", content: text.substring(0, 1000) }
                ],
                temperature: 0.1,
            })
        });

        if (!response.ok) {
            throw new Error("Groq API failed");
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Extract JSON from the response
        const jsonMatch = content.match(/\[.*\]/s);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : [{ label: 'NEUTRAL', score: 0.5 }];
        
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Detection error:", error);
        return NextResponse.json([{ label: 'NEUTRAL', score: 0.5 }]);
    }
}
