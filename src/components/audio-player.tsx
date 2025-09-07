"use client";

import { useAudioPlayer } from '@/context/audio-player-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pause, Play, StopCircle, X } from 'lucide-react';
import type { Language } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AudioPlayer({ language }: { language: Language }) {
  const { processedArticle, isPlaying, progress, togglePlayPause, stop, seek } = useAudioPlayer();

  if (!processedArticle) {
    return null;
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const newProgress = (x / width) * 100;
    seek(newProgress);
  };
  
  const title = language === 'hi' && processedArticle.titleHi ? processedArticle.titleHi : processedArticle.title;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 backdrop-blur-sm transition-transform duration-300 ease-in-out"
         style={{ transform: `translateY(${processedArticle ? '0%' : '100%'})` }}>
      <Card className="max-w-4xl mx-auto p-4 shadow-2xl bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={togglePlayPause}>
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
          </Button>
          <div className="flex-1 overflow-hidden">
            <p className="font-bold truncate font-headline">{title}</p>
            <p className="text-sm text-muted-foreground">{processedArticle.source.name}</p>
            <div className="mt-2" onClick={handleProgressClick} >
              <Progress value={progress} className="h-2 cursor-pointer" />
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={stop}>
            <X className="h-6 w-6" />
            <span className="sr-only">Close Player</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
