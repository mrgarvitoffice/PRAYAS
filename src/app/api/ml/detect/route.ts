import { NextResponse } from 'next/server';
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to use the remote Hugging Face hub
// This prevents it from trying to read models from the local file system
env.allowLocalModels = false;

class PipelineSingleton {
    static task = 'text-classification' as const;
    static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
    static instance: any = null;

    static async getInstance(progress_callback?: Function) {
        if (this.instance === null) {
            // @ts-ignore - The pipeline function works fine but type definitions in Next.js get confused
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

export async function POST(req: Request) {
    try {
        const { text } = await req.json();
        
        if (!text) {
            return NextResponse.json({ error: 'Text is required for analysis.' }, { status: 400 });
        }

        // Get the singleton pipeline
        const classifier = await PipelineSingleton.getInstance();
        
        // The model can process a maximum of 512 tokens. 
        // We truncate the input to ~1500 characters to be safe.
        const truncatedText = text.substring(0, 1500);
        
        // Run the text classification ML model
        const result = await classifier(truncatedText);
        
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("ML processing error:", error);
        return NextResponse.json({ error: error.message || 'Failed to process ML detection' }, { status: 500 });
    }
}
