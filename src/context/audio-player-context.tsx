
"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Article, Language } from '@/lib/types';
import { generateDiscussionAudio } from '@/ai/flows/generate-discussion-audio';
import { summarizeArticle } from '@/ai/flows/summarize-article';
import { translateAndSummarizeArticleHindi } from '@/ai/flows/translate-and-summarize-article-hindi';
import { useToast } from '@/hooks/use-toast';

interface AudioPlayerContextType {
  currentArticleId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  playArticle: (article: Article, language: Language) => void;
  togglePlayPause: () => void;
  stop: () => void;
  seek: (progress: number) => void;
  onArticleUpdate?: (article: Article) => void;
  article: Article | null;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  
  const onArticleUpdateRef = useRef<(article: Article) => void>();

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    setProgress(0);
    setArticle(null);
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

  const processAndCacheArticle = useCallback(async (articleToProcess: Article, language: Language): Promise<Article> => {
    let updatedArticle = { ...articleToProcess };
    
    // Step 1: Ensure article has summary and important points in the required language.
    // This is the "on-demand" text processing part.
    const needsEnglishProcessing = language === 'en' && articleToProcess.importantPoints.length === 0;
    const needsHindiProcessing = language === 'hi' && (!articleToProcess.titleHi || articleToProcess.importantPointsHi.length === 0);

    if (needsEnglishProcessing || needsHindiProcessing) {
      toast({
        title: "Generating Smart Summary...",
        description: `Processing "${articleToProcess.title.slice(0, 50)}..."`,
      });
      
      try {
        const [englishSummary, hindiSummary] = await Promise.all([
            summarizeArticle({ title: articleToProcess.title, full_text: articleToProcess.rawContent }),
            translateAndSummarizeArticleHindi({ articleTitle: articleToProcess.title, articleContent: articleToProcess.rawContent })
        ]);

        updatedArticle = {
            ...updatedArticle,
            title: englishSummary.heading,
            summary: englishSummary.important_points.join(' '),
            importantPoints: englishSummary.important_points,
            titleHi: hindiSummary.translatedTitle,
            summaryHi: hindiSummary.summaryPoints.join(' '),
            importantPointsHi: hindiSummary.summaryPoints,
        };
      } catch (e) {
          console.error("Error during summarization:", e);
          toast({ variant: 'destructive', title: 'Summarization Failed', description: e instanceof Error ? e.message : 'Could not process article.' });
          throw e; // Re-throw to stop the process
      }
    }
    
    // Step 2: Generate audio from the processed text.
    const contentToRead = language === 'hi'
        ? `Title: ${updatedArticle.titleHi}. Summary: ${updatedArticle.importantPointsHi.join('. ')}`
        : `Title: ${updatedArticle.title}. Summary: ${updatedArticle.importantPoints.join('. ')}`;

    if (!contentToRead.trim()) {
        throw new Error("Cannot generate audio from empty content.");
    }
    
    try {
        toast({ title: "Generating AI discussion...", description: "This might take a moment." });
        const result = await generateDiscussionAudio({ content: contentToRead, language });
        if (language === 'en') {
          updatedArticle.audioDataUriEn = result.audioDataUri;
        } else {
          updatedArticle.audioDataUriHi = result.audioDataUri;
        }
    } catch (e) {
        console.error("Error during audio generation:", e);
        // Let the flow's specific error handler create the message
        toast({ variant: 'destructive', title: 'Audio Generation Failed', description: e instanceof Error ? e.message : 'Could not generate audio.'});
        throw e; // Re-throw
    }

    if (onArticleUpdateRef.current) {
        onArticleUpdateRef.current(updatedArticle);
    }

    return updatedArticle;
  }, [toast]);
  
  const playArticle = useCallback(async (articleToPlay: Article, language: Language) => {
    if (isLoading) return;
    
    if (article?.id === articleToPlay.id) {
        togglePlayPause();
        return;
    }
    
    stop();
    setIsLoading(true);
    setArticle(articleToPlay);

    try {
        let articleWithAudio = { ...articleToPlay };
        const audioUri = language === 'en' ? articleToPlay.audioDataUriEn : articleToPlay.audioDataUriHi;
        
        // This is the core of the caching logic.
        // If we don't have an audio URI, we generate and cache it.
        if (!audioUri) {
            articleWithAudio = await processAndCacheArticle(articleToPlay, language);
        }
        
        // At this point, articleWithAudio *should* have the URI.
        setArticle(articleWithAudio);
        
        const finalAudioUri = language === 'en' ? articleWithAudio.audioDataUriEn : articleWithAudio.audioDataUriHi;

        if (audioRef.current && finalAudioUri) {
            audioRef.current.src = finalAudioUri;
            await audioRef.current.play();
        } else {
            // This case should ideally not be hit if processAndCacheArticle works.
            throw new Error("Audio data is not available even after processing.");
        }
    } catch (error) {
      console.error('Playback failed:', error);
      // Ensure player is stopped and reset on any failure.
      stop();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, article, processAndCacheArticle, stop, togglePlayPause]);

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

  const value: AudioPlayerContextType = {
    currentArticleId: article?.id || null,
    article,
    isPlaying,
    isLoading,
    progress,
    playArticle,
    togglePlayPause,
    stop,
    seek,
    set onArticleUpdate(callback: ((article: Article) => void) | undefined) {
      onArticleUpdateRef.current = callback;
    },
    get onArticleUpdate() {
      return onArticleUpdateRef.current;
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
