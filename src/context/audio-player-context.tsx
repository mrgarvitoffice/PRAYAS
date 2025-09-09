
"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Article, Language } from '@/lib/types';
import { translateAndSummarizeArticleHindi } from '@/ai/flows/translate-and-summarize-article-hindi';
import { useToast } from '@/hooks/use-toast';

interface AudioPlayerContextType {
  // Shared
  stop: () => void;
  isLoading: boolean;
  isPlaying: boolean; // General playing state for the whole player
  mode: 'article' | 'playlist' | 'idle';

  // Article Mode
  currentArticleId: string | null;
  article: Article | null;
  playArticle: (article: Article, language: Language) => void;
  togglePlayPause: () => void;
  onArticleUpdate?: (article: Article) => void;
  
  // Playlist Mode
  playlistAudioUri: string | null;
  playlistTitle: string;
  playlistSubtitle: string;
  isPlaylistPlaying: boolean;
  playlistProgress: number; // 0-100
  playPlaylist: (audioUri: string, title: string, subtitle: string) => void;
  togglePlaylistPlayPause: (forceState?: boolean) => void;
  seekPlaylist: (progress: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'article' | 'playlist' | 'idle'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Article-specific state
  const [article, setArticle] = useState<Article | null>(null);
  const [isArticlePlaying, setIsArticlePlaying] = useState(false);
  const onArticleUpdateRef = useRef<(article: Article) => void>();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Playlist-specific state
  const [playlistAudioUri, setPlaylistAudioUri] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistSubtitle, setPlaylistSubtitle] = useState('');
  const [isPlaylistPlaying, setIsPlaylistPlaying] = useState(false);
  const [playlistProgress, setPlaylistProgress] = useState(0);

  const stop = useCallback(() => {
    // Stop browser speech
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    // Stop playlist audio
    setPlaylistAudioUri(null);
    
    // Reset all states
    setMode('idle');
    setIsLoading(false);
    setArticle(null);
    setIsArticlePlaying(false);
    setPlaylistTitle('');
    setPlaylistSubtitle('');
    setIsPlaylistPlaying(false);
    setPlaylistProgress(0);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (mode === 'article' && utteranceRef.current) {
      if (isArticlePlaying) {
        window.speechSynthesis.pause();
      } else {
        window.speechSynthesis.resume();
      }
      setIsArticlePlaying(!isArticlePlaying);
    }
  }, [mode, isArticlePlaying]);

  const processAndCacheArticle = useCallback(async (articleToProcess: Article, language: Language): Promise<Article | null> => {
    const needsProcessing = language === 'hi' && (!articleToProcess.titleHi || articleToProcess.importantPointsHi.length === 0);

    if (needsProcessing) {
      toast({
        title: "Generating Smart Summary...",
        description: `Translating "${articleToProcess.title.slice(0, 50)}..."`,
      });
      
      try {
        const hindiSummary = await translateAndSummarizeArticleHindi({ articleTitle: articleToProcess.title, articleContent: articleToProcess.rawContent });
        const updatedArticle = {
          ...articleToProcess,
          titleHi: hindiSummary.translatedTitle,
          summaryHi: hindiSummary.summaryPoints.join(' '),
          importantPointsHi: hindiSummary.summaryPoints,
        };
        
        if (onArticleUpdateRef.current) {
           onArticleUpdateRef.current(updatedArticle);
        }
        return updatedArticle;

      } catch (e) {
          console.error("Error during translation:", e);
          toast({ variant: 'destructive', title: 'Translation Failed', description: e instanceof Error ? e.message : 'Could not process article.' });
          return null; // Return null on failure
      }
    }
    
    return articleToProcess;
  }, [toast]);
  
  const playArticle = useCallback(async (articleToPlay: Article, language: Language) => {
    if (isLoading) return;
    
    if (mode === 'article' && article?.id === articleToPlay.id) {
        togglePlayPause();
        return;
    }
    
    stop();
    setMode('article');
    setIsLoading(true);
    setArticle(articleToPlay);

    try {
        let articleWithContent = await processAndCacheArticle(articleToPlay, language);
        
        if (!articleWithContent) {
            stop();
            return;
        }
        
        const title = language === 'hi' && articleWithContent.titleHi ? articleWithContent.titleHi : articleWithContent.title;
        const points = language === 'hi' && articleWithContent.importantPointsHi.length > 0 ? articleWithContent.importantPointsHi : articleWithContent.importantPoints;
        const fallbackSummary = language === 'hi' && articleWithContent.summaryHi ? articleWithContent.summaryHi : articleWithContent.summary;

        const contentToRead = points.length > 0 
            ? `Title: ${title}. Summary: ${points.join('. ')}`
            : `Title: ${title}. Summary: ${fallbackSummary}`;


        utteranceRef.current = new SpeechSynthesisUtterance(contentToRead);
        const utterance = utteranceRef.current;
        
        const langCode = language === 'hi' ? 'hi-IN' : 'en-US';
        utterance.lang = langCode;

        const voices = window.speechSynthesis.getVoices();
        const bestVoice = voices.find(v => v.lang === langCode && v.name.toLowerCase().includes('google')) ||
                          voices.find(v => v.lang === langCode && v.name.toLowerCase().includes('natural')) ||
                          voices.find(v => v.lang === langCode && v.localService) ||
                          voices.find(v => v.lang === langCode);

        if (bestVoice) {
            utterance.voice = bestVoice;
        }

        utterance.onstart = () => setIsArticlePlaying(true);
        utterance.onpause = () => setIsArticlePlaying(false);
        utterance.onresume = () => setIsArticlePlaying(true);
        utterance.onend = stop;
        utterance.onerror = (e) => {
            console.error("Speech synthesis error", e);
            toast({ variant: 'destructive', title: 'Playback Error', description: 'Could not play audio using browser TTS.' });
            stop();
        };
        
        window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('Playback failed:', error);
      toast({ variant: 'destructive', title: 'Playback Error', description: error instanceof Error ? error.message : 'Could not play audio.' });
      stop();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, article, mode, processAndCacheArticle, stop, togglePlayPause, toast]);


  const playPlaylist = useCallback((audioUri: string, title: string, subtitle: string) => {
    stop();
    setMode('playlist');
    setPlaylistAudioUri(audioUri);
    setPlaylistTitle(title);
    setPlaylistSubtitle(subtitle);
    setIsPlaylistPlaying(true);
  }, [stop]);

  const togglePlaylistPlayPause = useCallback((forceState?: boolean) => {
      setIsPlaylistPlaying(current => forceState !== undefined ? forceState : !current);
  }, []);
  
  const seekPlaylist = useCallback((newProgress: number) => {
      setPlaylistProgress(newProgress);
      // Logic to seek the actual audio element will be in the component
  }, []);

  const value: AudioPlayerContextType = {
    // Shared
    stop,
    isLoading,
    isPlaying: isArticlePlaying || isPlaylistPlaying,
    mode,
    // Article
    currentArticleId: article?.id || null,
    article,
    playArticle,
    togglePlayPause,
    onArticleUpdate: onArticleUpdateRef.current,
    set onArticleUpdate(callback: ((article: Article) => void) | undefined) {
      onArticleUpdateRef.current = callback;
    },
    // Playlist
    playlistAudioUri,
    playlistTitle,
    playlistSubtitle,
    isPlaylistPlaying,
    playlistProgress,
    playPlaylist,
    togglePlaylistPlayPause,
    seekPlaylist
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
