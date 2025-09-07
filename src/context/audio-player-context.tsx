
"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Article, Language } from '@/lib/types';
import { generateTTSAudioClip } from '@/ai/flows/generate-tts-audio-clip';
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
  updateArticleInList: (article: Article) => void;
  onArticleProcessed?: (article: Article) => void; // Optional callback
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
  
  const [playlist, setPlaylist] = useState<Article[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playlistLanguage, setPlaylistLanguage] = useState<Language>('en');

  // This is a proxy to allow parent components to update their state
  const onArticleProcessedRef = useRef<(article: Article) => void>();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      const audio = audioRef.current;

      const handleTimeUpdate = () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      const handleEnded = () => setIsPlaying(false);
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
  }, []);
  
  const updateArticleInList = useCallback((article: Article) => {
     setPlaylist(prev => prev.map(a => a.id === article.id ? article : a));
    if (processedArticle?.id === article.id) {
      setProcessedArticle(article);
    }
  }, [processedArticle]);

  const playArticle = useCallback(async (article: Article, language: Language) => {
    if (audioRef.current) {
      if (currentArticle?.id === article.id) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        return;
      }

      setIsLoading(true);
      setCurrentArticle(article);
      setProcessedArticle(null);
      setProgress(0);
      setIsPlaying(false);
      
      try {
        let finalTitle = article.title;
        let finalPoints: string[] = [];
        let updatedArticle = { ...article };

        const needsProcessing = (language === 'hi' && !article.titleHi) || (language === 'en' && article.importantPoints.length === 0);

        if (needsProcessing) {
          toast({
            title: "Generating Smart Summary...",
            description: `Processing "${article.title}"`,
          });
          const [englishSummary, hindiSummary] = await Promise.all([
            summarizeArticle({
              title: article.title,
              full_text: article.rawContent,
            }),
            translateAndSummarizeArticleHindi({
              articleTitle: article.title,
              articleContent: article.rawContent,
            })
          ]);
          
          updatedArticle = {
            ...article,
            title: englishSummary.heading,
            titleHi: hindiSummary.translatedTitle,
            importantPoints: englishSummary.important_points,
            importantPointsHi: hindiSummary.summaryPoints,
            summary: englishSummary.important_points.join(' '),
            summaryHi: hindiSummary.summaryPoints.join(' '),
          };
          
          if (onArticleProcessedRef.current) {
            onArticleProcessedRef.current(updatedArticle);
          }
          setProcessedArticle(updatedArticle);

        } else {
          setProcessedArticle(article);
        }
        
        finalTitle = language === 'hi' && updatedArticle.titleHi ? updatedArticle.titleHi : updatedArticle.title;
        finalPoints = language === 'hi' && updatedArticle.importantPointsHi.length > 0 ? updatedArticle.importantPointsHi : (language === 'en' && updatedArticle.importantPoints.length > 0) ? updatedArticle.importantPoints : updatedArticle.summary.split('. ');

        if(!finalTitle || finalPoints.length === 0) {
            throw new Error("Content for TTS is not available after processing.")
        }
        
        const ttsInput = {
          title: finalTitle,
          importantPoints: finalPoints,
          language: language === 'hi' ? 'hi-IN' : 'en-IN',
        };

        const result = await generateTTSAudioClip(ttsInput);
        audioRef.current.src = result.audioDataUri;
        audioRef.current.play();

      } catch (error) {
        console.error('On-demand processing or TTS Generation failed:', error);
        toast({
          variant: 'destructive',
          title: 'Playback Failed',
          description: error instanceof Error ? error.message : 'Could not process or generate the audio for this article.',
        });
        setCurrentArticle(null);
        setProcessedArticle(null);
      } finally {
        setIsLoading(false);
      }
    }
  }, [toast, currentArticle, isPlaying]);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current?.src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, [isPlaying]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentArticle(null);
      setProcessedArticle(null);
      setIsPlaying(false);
      setProgress(0);
      setPlaylist([]);
      setCurrentTrackIndex(0);
    }
  }, []);

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
    updateArticleInList,
    // onArticleProcessed is now a ref to be set by a consumer
    set onArticleProcessed(callback: (article: Article) => void) {
      onArticleProcessedRef.current = callback;
    },
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
