"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Article, Language } from '@/lib/types';
import { generateTTSAudioClip } from '@/ai/flows/generate-tts-audio-clip';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AudioPlayerContextType {
  currentArticle: Article | null;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  playArticle: (article: Article, language: Language) => void;
  togglePlayPause: () => void;
  stop: () => void;
  seek: (progress: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      const audio = audioRef.current;

      const handleTimeUpdate = () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentArticle(null);
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
  }, []);

  const playArticle = useCallback(async (article: Article, language: Language) => {
    if (audioRef.current) {
      setIsLoading(true);
      setCurrentArticle(article);
      setProgress(0);
      setIsPlaying(false);

      toast({
        title: "Generating Audio...",
        description: "Please wait while we prepare the audio summary.",
        duration: 5000,
      });

      try {
        const ttsInput = {
          title: language === 'hi' ? article.titleHi : article.title,
          importantPoints: language === 'hi' ? article.importantPointsHi : article.importantPoints,
          language: language === 'hi' ? 'hi-IN' : 'en-IN',
        };
        const result = await generateTTSAudioClip(ttsInput);
        audioRef.current.src = result.audioDataUri;
        audioRef.current.play();
      } catch (error) {
        console.error('TTS Generation failed:', error);
        toast({
          variant: 'destructive',
          title: 'Audio Generation Failed',
          description: 'Could not generate the audio for this article.',
        });
        setCurrentArticle(null);
      } finally {
        setIsLoading(false);
      }
    }
  }, [toast]);

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
      setIsPlaying(false);
      setProgress(0);
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
    isPlaying,
    isLoading,
    progress,
    playArticle,
    togglePlayPause,
    stop,
    seek,
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
