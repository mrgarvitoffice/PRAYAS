
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
  playPlaylist: (articles: Article[], language: Language) => void;
  togglePlayPause: () => void;
  stop: () => void;
  seek: (progress: number) => void;
  updateArticleInPlaylist: (article: Article) => void;
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

  const onArticleProcessedRef = useRef<(article: Article) => void>();
  
  const stop = useCallback((isSoftStop = false) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsPlaying(false);
      setProgress(0);
      setCurrentArticle(null);
      setProcessedArticle(null);
      if (!isSoftStop) {
          setPlaylist([]);
          setCurrentTrackIndex(0);
      }
    }
  }, []);

  const playNextInPlaylist = useCallback(() => {
    if (playlist.length > 0 && currentTrackIndex < playlist.length - 1) {
      const nextIndex = currentTrackIndex + 1;
      setCurrentTrackIndex(nextIndex);
      // The processAndPlayArticle function is defined below, so we can't call it directly here.
      // The useEffect hook will handle playing the next track.
    } else {
      // Playlist finished
      stop();
    }
  }, [playlist, currentTrackIndex, stop]);

  const processAndPlayArticle = useCallback(async (article: Article, language: Language, isPlaylist: boolean) => {
    if (!audioRef.current) return;

    if (currentArticle?.id !== article.id || !audioRef.current.src) {
        stop(true); // Soft stop, doesn't clear playlist
        setIsLoading(true);
        setCurrentArticle(article);
        setProcessedArticle(null);
    } else {
        // If it's the same article and it's loaded, just play/pause
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        return;
    }

    try {
        let updatedArticle = { ...article };
        const needsProcessing = (language === 'en' && updatedArticle.importantPoints.length === 0) || (language === 'hi' && !updatedArticle.titleHi);

        if (needsProcessing) {
            toast({
                title: "Generating Smart Summary...",
                description: `Processing "${article.title}"`,
            });
            
            const [englishSummary, hindiSummary] = await Promise.all([
                summarizeArticle({ title: article.title, full_text: article.rawContent }),
                translateAndSummarizeArticleHindi({ articleTitle: article.title, articleContent: article.rawContent })
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
            
            if (onArticleProcessedRef.current) {
                onArticleProcessedRef.current(updatedArticle);
            }
        }
        
        setProcessedArticle(updatedArticle);
        
        const contentToRead = language === 'hi' 
            ? `Title: ${updatedArticle.titleHi}. Summary: ${updatedArticle.summaryHi}`
            : `Title: ${updatedArticle.title}. Summary: ${updatedArticle.summary}`;
            
        if (!contentToRead.trim()) {
            throw new Error("Cannot generate audio from empty content.");
        }

        const result = await generateDiscussionAudio({ content: contentToRead, language });
        audioRef.current.src = result.audioDataUri;
        await audioRef.current.play();

    } catch (error) {
        console.error('On-demand processing or TTS Generation failed:', error);
        toast({
            variant: 'destructive',
            title: 'Playback Failed',
            description: error instanceof Error ? error.message : 'Could not process or generate the audio for this article.',
        });
        setCurrentArticle(null);
        setProcessedArticle(null);
        if (isPlaylist) {
            playNextInPlaylist();
        }
    } finally {
        setIsLoading(false);
    }
  }, [toast, currentArticle, isPlaying, playNextInPlaylist, stop]);

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
          if (playlist.length > 0 && currentTrackIndex < playlist.length - 1) {
              playNextInPlaylist();
          } else {
              setIsPlaying(false);
              stop();
          }
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
  }, [playlist, currentTrackIndex, playNextInPlaylist, stop]);

  // Effect to handle playlist progression
  useEffect(() => {
    if (playlist.length > 0 && currentTrackIndex > 0) {
      processAndPlayArticle(playlist[currentTrackIndex], playlistLanguage, true);
    }
  }, [currentTrackIndex, playlist, playlistLanguage, processAndPlayArticle]);
  
  const updateArticleInPlaylist = useCallback((article: Article) => {
    setPlaylist(prev => prev.map(a => a.id === article.id ? article : a));
    if (processedArticle?.id === article.id) {
      setProcessedArticle(article);
    }
  }, [processedArticle]);

  const playArticle = useCallback(async (article: Article, language: Language) => {
    setPlaylist([]); // Clear any existing playlist
    setCurrentTrackIndex(0);
    setPlaylistLanguage(language);
    processAndPlayArticle(article, language, false);
  }, [processAndPlayArticle]);

  const playPlaylist = useCallback((articles: Article[], language: Language) => {
    setPlaylist(articles);
    setCurrentTrackIndex(0);
    setPlaylistLanguage(language);
    if (articles.length > 0) {
        processAndPlayArticle(articles[0], language, true);
    }
  }, [processAndPlayArticle]);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current?.src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audio_ref.current.play();
      }
    }
  }, [isPlaying]);

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
    playPlaylist,
    togglePlayPause,
    stop,
    seek,
    updateArticleInPlaylist,
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
