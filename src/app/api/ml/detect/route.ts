import { NextResponse } from 'next/server';
import { getCredibilityFewShotExamples } from '@/lib/ml/training-data';

// AI Detect: Analyzes news article credibility and factual accuracy using Groq.
// Returns a credibility score (0-1) and a verdict (CREDIBLE / MISLEADING / UNVERIFIED).
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

        const truncatedText = text.substring(0, 1500);

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
                        content: `You are a professional news credibility and fact-checking AI system trained on Indian news.
Analyze the given news article and assess its credibility.

Respond ONLY with a valid JSON object in this EXACT format (no other text):
{"label": "CREDIBLE" | "MISLEADING" | "UNVERIFIED", "score": <number>}

Use EXACTLY these scores:
- "CREDIBLE": score must be exactly 0.97 — factually sound, objective, cites sources
- "UNVERIFIED": score must be exactly 0.75 — lacks clear sourcing, cannot be fully confirmed
- "MISLEADING": score must be exactly 0.61 — sensationalist, logically inconsistent, or appears false

Training examples (few-shot):
${getCredibilityFewShotExamples()}

Now classify the user's article using the same pattern.`
                    },
                    {
                        role: "user",
                        content: `Analyze the credibility of this news:\n\n${truncatedText}`
                    }
                ],
                temperature: 0.1,
                max_tokens: 80,
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.statusText}`);
        }

        const data = await response.json();
        const rawContent = data.choices[0].message.content.trim();
        
        // Extract JSON robustly even if model adds extra text
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Could not parse credibility response');
        
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Return in format UI expects: [{ label, score }]
        return NextResponse.json([{ label: parsed.label, score: parsed.score }]);

    } catch (error: any) {
        console.error("ML credibility check error:", error);
        return NextResponse.json({ error: error.message || 'Failed to analyze credibility' }, { status: 500 });
    }
}
