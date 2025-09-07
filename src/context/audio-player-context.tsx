
"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Article, Language } from '@/lib/types';
import { generateDiscussionAudio } from '@/ai/flows/generate-discussion-audio';
import { summarizeArticle } from '@/ai/flows/summarize-article';
import { translateAndSummarizeArticleHindi } from '@/ai/flows/translate-and-summarize-article-hindi';
import { useToast } from '@/hooks/use-toast';

interface AudioPlayerContextType {
  currentArticle: Article | null;
  processedArticle: Article | null;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  playArticle: (article: Article, language: Language) => void;
  togglePlayPause: () => void;
  stop: () => void;
  seek: (progress: number) => void;
  onArticleProcessed?: (article: Article) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [processedArticle, setProcessedArticle] = useState<Article | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const onArticleProcessedRef = useRef<(article: Article) => void>();

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    setProgress(0);
    setCurrentArticle(null);
    setProcessedArticle(null);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current?.src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, [isPlaying]);

  const processArticle = useCallback(async (article: Article, language: Language): Promise<Article> => {
    let updatedArticle = { ...article };
    const needsProcessing = (language === 'en' && !article.importantPoints?.length) || (language === 'hi' && !article.titleHi);

    if (needsProcessing) {
      toast({
        title: "Generating Smart Summary...",
        description: `Processing "${article.title}"`,
      });
      
      try {
        const [englishSummary, hindiSummary] = await Promise.all([
            summarizeArticle({ title: article.title, full_text: article.rawContent }),
            translateAndSummarizeArticleHindi({ articleTitle: article.title, articleContent: article.rawContent })
        ]);

        updatedArticle = {
            ...updatedArticle,
            title: englishSummary.heading,
            summary: englishSummary.important_points.join(' '), // Keep a concatenated version for simple display if needed
            importantPoints: englishSummary.important_points, // Keep the array for list rendering
            titleHi: hindiSummary.translatedTitle,
            summaryHi: hindiSummary.summaryPoints.join(' '),
            importantPointsHi: hindiSummary.summaryPoints,
        };
      } catch (e) {
          console.error("Error during summarization:", e);
          toast({ variant: 'destructive', title: 'Summarization Failed', description: e instanceof Error ? e.message : 'Could not process article.' });
          throw e; // Re-throw to stop playback attempt
      }
    }
    
    // Always generate a fresh audio clip for the requested language
    const contentToRead = language === 'hi'
        ? `Title: ${updatedArticle.titleHi}. Summary: ${updatedArticle.importantPointsHi.join('. ')}`
        : `Title: ${updatedArticle.title}. Summary: ${updatedArticle.importantPoints.join('. ')}`;

    if (!contentToRead.trim()) {
        throw new Error("Cannot generate audio from empty content.");
    }
    const result = await generateDiscussionAudio({ content: contentToRead, language });
    updatedArticle.audioDataUri = result.audioDataUri;

    if (onArticleProcessedRef.current) {
        onArticleProcessedRef.current(updatedArticle);
    }

    return updatedArticle;
  }, [toast]);
  
  const playArticle = useCallback(async (article: Article, language: Language) => {
    if (isLoading) return;
    if (currentArticle?.id === article.id && isPlaying) {
      togglePlayPause();
      return;
    }
     if (currentArticle?.id === article.id && !isPlaying) {
      togglePlayPause();
      return;
    }
    
    stop();
    setIsLoading(true);
    setCurrentArticle(article);
    setProcessedArticle(null);

    try {
      const articleWithAudio = await processArticle(article, language);
      setProcessedArticle(articleWithAudio);
      if (audioRef.current) {
        audioRef.current.src = articleWithAudio.audioDataUri!;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('On-demand processing or TTS Generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Playback Failed',
        description: error instanceof Error ? error.message : 'Could not process or generate the audio for this article.',
      });
      stop();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentArticle, isPlaying, processArticle, stop, toast, togglePlayPause]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
      const audio = audioRef.current;

      const handleTimeUpdate = () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      const handleEnded = () => {
        setIsPlaying(false);
        stop();
      };
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.pause();
      };
    }
  }, [stop]);
  
  const seek = useCallback((newProgress: number) => {
    if (audioRef.current && audioRef.current.duration) {
        const newTime = (newProgress / 100) * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
        setProgress(newProgress);
    }
  }, []);

  const value = {
    currentArticle,
    processedArticle,
    isPlaying,
    isLoading,
    progress,
    playArticle,
    togglePlayPause,
    stop,
    seek,
    set onArticleProcessed(callback: (article: Article) => void) {
      onArticleProcessedRef.current = callback;
    },
    get onArticleProcessed() {
      return onArticleProcessedRef.current;
    }
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
};

export const useAudioPlayer = (): AudioPlayerContextType => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

    
