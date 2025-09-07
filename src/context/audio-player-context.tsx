
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
  playlist: Article[];
  playArticle: (article: Article, language: Language) => void;
  playText: (text: string, language: Language) => void;
  addOrRemoveFromPlaylist: (article: Article) => void;
  togglePlayPause: () => void;
  stop: () => void;
  seek: (progress: number) => void;
  updateArticleInPlaylist: (article: Article) => void;
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
  
  const [playlist, setPlaylist] = useState<Article[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaylistActive, setIsPlaylistActive] = useState(false);
  const [playlistLanguage, setPlaylistLanguage] = useState<Language>('en');

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
    setIsPlaylistActive(false); 
  }, []);

  const playNextInPlaylist = useCallback(() => {
    if (isPlaylistActive && currentTrackIndex < playlist.length - 1) {
      const nextIndex = currentTrackIndex + 1;
      setCurrentTrackIndex(nextIndex);
      // The useEffect hook will trigger playback of the next article
    } else {
      stop(); // End of playlist
    }
  }, [isPlaylistActive, playlist, currentTrackIndex, stop]);
  
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
            summary: englishSummary.important_points.join(' '),
            importantPoints: englishSummary.important_points,
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
        ? `Title: ${updatedArticle.titleHi}. Summary: ${updatedArticle.summaryHi}`
        : `Title: ${updatedArticle.title}. Summary: ${updatedArticle.summary}`;

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
    if (currentArticle?.id === article.id && audioRef.current?.src && !audioRef.current.paused) {
      audioRef.current.pause();
      return;
    }
    if (currentArticle?.id === article.id && audioRef.current?.src && audioRef.current.paused) {
      audioRef.current.play();
      return;
    }
    
    stop();
    setIsLoading(true);
    setCurrentArticle(article);
    setProcessedArticle(null);

    try {
      const articleWithAudio = await processArticle(article, language);
      setProcessedArticle(articleWithAudio);
      audioRef.current.src = articleWithAudio.audioDataUri;
      await audioRef.current.play();
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
  }, [isLoading, currentArticle, processArticle, stop, toast]);
  
  const togglePlayPause = useCallback(() => {
    if (audioRef.current?.src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, [isPlaying]);

  const playText = useCallback(async (text: string, language: Language) => {
    if (isLoading) return;
    stop();
    setIsLoading(true);
    setCurrentArticle(null); // It's not an article-specific playback
    setProcessedArticle(null);
    try {
        const { audioDataUri } = await generateDiscussionAudio({ content: text, language });
        audioRef.current.src = audioDataUri;
        await audioRef.current.play();
    } catch (error) {
        console.error('Text-to-speech generation failed:', error);
        toast({
            variant: 'destructive',
            title: 'Playback Failed',
            description: error instanceof Error ? error.message : 'Could not generate the audio for the headlines.',
        });
        stop();
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, stop, toast]);

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
        if (isPlaylistActive) {
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
  }, [isPlaylistActive, playNextInPlaylist, stop]);
  
  // Effect to handle playlist progression
  useEffect(() => {
    if (isPlaylistActive && playlist.length > 0) {
      playArticle(playlist[currentTrackIndex], playlistLanguage);
    }
  }, [currentTrackIndex, isPlaylistActive, playlist, playlistLanguage, playArticle]);

  const addOrRemoveFromPlaylist = (article: Article) => {
    setPlaylist(prev => {
        const exists = prev.some(a => a.id === article.id);
        if (exists) {
            toast({ title: 'Removed from playlist', description: `"${article.title}" removed.` });
            return prev.filter(a => a.id !== article.id);
        } else {
            toast({ title: 'Added to playlist', description: `"${article.title}" added.` });
            return [...prev, article];
        }
    });
  };

  const seek = useCallback((newProgress: number) => {
    if (audioRef.current && audioRef.current.duration) {
        const newTime = (newProgress / 100) * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
        setProgress(newProgress);
    }
  }, []);

  const updateArticleInPlaylist = useCallback((article: Article) => {
    setPlaylist(prev => prev.map(a => a.id === article.id ? article : a));
    if (currentArticle?.id === article.id) {
        setProcessedArticle(article);
    }
  }, [currentArticle]);

  const value = {
    currentArticle,
    processedArticle,
    isPlaying,
    isLoading,
    progress,
    playlist,
    playArticle,
    playText,
    addOrRemoveFromPlaylist,
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
