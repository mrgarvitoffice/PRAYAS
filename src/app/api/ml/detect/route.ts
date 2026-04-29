import { NextResponse } from 'next/server';

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
                        content: `You are a professional news credibility and fact-checking AI system.
Your task is to analyze the given news article text and assess its credibility based on:
1. Factual consistency - does the content contradict known facts?
2. Journalistic quality - is the language objective or sensationalist?
3. Source reliability signals - does it cite specific sources, dates, locations?
4. Logical coherence - are claims well-supported or vague?

Respond ONLY with a valid JSON object in this EXACT format (no other text):
{"label": "CREDIBLE" | "MISLEADING" | "UNVERIFIED", "score": <float between 0.5 and 1.0>}

Where:
- "CREDIBLE" = appears factually sound, objective reporting (score 0.75–1.0)
- "UNVERIFIED" = lacks clear sources, cannot be confirmed (score 0.5–0.74)  
- "MISLEADING" = sensationalist, logically inconsistent, or appears false (score 0.5–0.65)
- score = confidence in the verdict`
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
