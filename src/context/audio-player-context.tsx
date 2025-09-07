
"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Article, Language } from '@/lib/types';
import { generateSingleSpeakerAudio } from '@/ai/flows/generate-single-speaker-audio';
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

  const processAndCacheArticle = useCallback(async (articleToProcess: Article, language: Language): Promise<Article | null> => {
    let updatedArticle = { ...articleToProcess };
    
    const needsProcessing = (language === 'en' && articleToProcess.importantPoints.length === 0) || (language === 'hi' && (!articleToProcess.titleHi || articleToProcess.importantPointsHi.length === 0));

    if (needsProcessing) {
      toast({
        title: "Generating Smart Summary...",
        description: `Processing "${articleToProcess.title.slice(0, 50)}..."`,
      });
      
      try {
        if (language === 'en') {
          const summary = await summarizeArticle({ title: articleToProcess.title, full_text: articleToProcess.rawContent });
          updatedArticle.title = summary.heading;
          updatedArticle.summary = summary.important_points.join(' ');
          updatedArticle.importantPoints = summary.important_points;
        } else { // language === 'hi'
          const hindiSummary = await translateAndSummarizeArticleHindi({ articleTitle: articleToProcess.title, articleContent: articleToProcess.rawContent });
          updatedArticle.titleHi = hindiSummary.translatedTitle;
          updatedArticle.summaryHi = hindiSummary.summaryPoints.join(' ');
          updatedArticle.importantPointsHi = hindiSummary.summaryPoints;
        }
      } catch (e) {
          console.error("Error during summarization:", e);
          toast({ variant: 'destructive', title: 'Summarization Failed', description: e instanceof Error ? e.message : 'Could not process article.' });
          return null; // Return null on failure
      }
    }
    
    const contentToRead = language === 'hi'
        ? `Title: ${updatedArticle.titleHi}. Summary: ${updatedArticle.importantPointsHi.join('. ')}`
        : `Title: ${updatedArticle.title}. Summary: ${updatedArticle.importantPoints.join('. ')}`;

    if (!contentToRead.trim()) {
        toast({ variant: 'destructive', title: 'Audio Generation Failed', description: 'Cannot generate audio from empty content.'});
        return null;
    }
    
    try {
        toast({ title: "Generating audio...", description: "This might take a moment." });
        const result = await generateSingleSpeakerAudio({ content: contentToRead, language });
        if (language === 'en') {
          updatedArticle.audioDataUriEn = result.audioDataUri;
        } else {
          updatedArticle.audioDataUriHi = result.audioDataUri;
        }
    } catch (e) {
        console.error("Error during audio generation:", e);
        let errorMessage = e instanceof Error ? e.message : 'Could not generate audio.';
        if (errorMessage.includes('429')) {
          errorMessage = 'You have exceeded the daily limit for audio generation. Please try again tomorrow.';
        }
        toast({ variant: 'destructive', title: 'Audio Generation Failed', description: errorMessage});
        return null;
    }

    if (onArticleUpdateRef.current) {
        onArticleUpdateRef.current(updatedArticle);
    }

    return updatedArticle;
  }, [toast]);
  
  const playArticle = useCallback(async (articleToPlay: Article, language: Language) => {
    if (isLoading) return;
    
    if (article?.id === articleToPlay.id && isPlaying) {
        togglePlayPause();
        return;
    }
    
    stop();
    setIsLoading(true);
    setArticle(articleToPlay);

    try {
        let articleWithAudio = { ...articleToPlay };
        const audioUri = language === 'en' ? articleToPlay.audioDataUriEn : articleToPlay.audioDataUriHi;
        
        if (!audioUri) {
            const processed = await processAndCacheArticle(articleToPlay, language);
            if (processed) {
              articleWithAudio = processed;
            } else {
              // Processing failed, stop everything.
              stop();
              return;
            }
        }
        
        setArticle(articleWithAudio);
        
        const finalAudioUri = language === 'en' ? articleWithAudio.audioDataUriEn : articleWithAudio.audioDataUriHi;

        if (audioRef.current && finalAudioUri) {
            audioRef.current.src = finalAudioUri;
            await audioRef.current.play();
        } else {
            throw new Error("Audio data is not available even after processing.");
        }
    } catch (error) {
      console.error('Playback failed:', error);
      toast({ variant: 'destructive', title: 'Playback Error', description: error instanceof Error ? error.message : 'Could not play audio.' });
      stop();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, article, processAndCacheArticle, stop, togglePlayPause, isPlaying, toast]);

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
