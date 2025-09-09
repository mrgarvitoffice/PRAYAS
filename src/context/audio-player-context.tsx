
"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Article, Language } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generatePlaylistAudio } from '@/ai/flows/generate-playlist-audio';

type ArticleProcessor = (article: Article, language: Language) => Promise<Article | null>;

interface AudioPlayerContextType {
  // Shared
  stop: () => void;
  isLoading: boolean;
  isPlaying: boolean; // General playing state for the whole player
  mode: 'article' | 'playlist' | 'idle';
  onArticleUpdate?: (article: Article) => void;

  // Article Mode
  currentArticleId: string | null;
  article: Article | null;
  audioUri: string | null;
  playArticle: (article: Article, language: Language, processArticle: ArticleProcessor) => void;
  togglePlayPause: () => void;
  
  // Playlist Mode
  playlistAudioUri: string | null;
  playlistTitle: string;
  playlistSubtitle: string;
  isPlaylistPlaying: boolean;
  playPlaylist: (audioUri: string, title: string, subtitle: string) => void;
  togglePlaylistPlayPause: (forceState?: boolean) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'article' | 'playlist' | 'idle'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Article-specific state
  const [article, setArticle] = useState<Article | null>(null);
  const [isArticlePlaying, setIsArticlePlaying] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const onArticleUpdateRef = useRef<(article: Article) => void>();
  
  // Playlist-specific state
  const [playlistAudioUri, setPlaylistAudioUri] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistSubtitle, setPlaylistSubtitle] = useState('');
  const [isPlaylistPlaying, setIsPlaylistPlaying] = useState(false);

  const stop = useCallback(() => {
    setMode('idle');
    setIsLoading(false);
    setArticle(null);
    setAudioUri(null);
    setIsArticlePlaying(false);
    setPlaylistAudioUri(null);
    setPlaylistTitle('');
    setPlaylistSubtitle('');
    setIsPlaylistPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (mode === 'article') {
        setIsArticlePlaying(prev => !prev);
    }
  }, [mode]);

  const playArticle = useCallback(async (
      articleToPlay: Article,
      language: Language,
      processArticle: ArticleProcessor
  ) => {
    if (isLoading) return;

    if (mode === 'article' && article?.id === articleToPlay.id) {
        togglePlayPause();
        return;
    }
    
    stop();
    setMode('article');
    setArticle(articleToPlay);
    setIsLoading(true);

    try {
      let articleWithContent = articleToPlay;
      const needsProcessing = language === 'hi' && !articleToPlay.titleHi;
      if (needsProcessing) {
          const processed = await processArticle(articleToPlay, language);
          if (!processed) {
              stop();
              return;
          }
          articleWithContent = processed;
      }
      
      const cachedAudioUri = language === 'hi' ? articleWithContent.audioDataUriHi : articleWithContent.audioDataUriEn;
      if (cachedAudioUri) {
          setAudioUri(cachedAudioUri);
          setIsArticlePlaying(true);
          setIsLoading(false);
          return;
      }

      toast({
        title: "Generating AI audio...",
        description: `Please wait while we create the audio for "${articleWithContent.title.slice(0, 50)}..."`,
      });

      const title = language === 'hi' ? articleWithContent.titleHi : articleWithContent.title;
      const content = language === 'hi' 
          ? (articleWithContent.summaryHi || articleWithContent.summary)
          : (articleWithContent.importantPoints.length > 0 ? articleWithContent.importantPoints.join('. ') : articleWithContent.summary);
      
      const result = await generatePlaylistAudio({
          articles: [{ title: title!, content: content! }],
          language: language
      });
      
      const newAudioUri = result.audioDataUri;
      setAudioUri(newAudioUri);
      setIsArticlePlaying(true);

      // Cache the result
      const updatedArticle = {
        ...articleWithContent,
        [language === 'hi' ? 'audioDataUriHi' : 'audioDataUriEn']: newAudioUri,
      };
      if (onArticleUpdateRef.current) {
        onArticleUpdateRef.current(updatedArticle);
      }
      setArticle(updatedArticle);

    } catch (error) {
      console.error('Playback failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not play audio.';
      toast({ variant: 'destructive', title: 'Playback Error', description: errorMessage });
      stop();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, article, mode, stop, togglePlayPause, toast]);


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

  const value: AudioPlayerContextType = {
    // Shared
    stop,
    isLoading,
    isPlaying: isArticlePlaying || isPlaylistPlaying,
    mode,
    onArticleUpdate: onArticleUpdateRef.current,
    set onArticleUpdate(callback: ((article: Article) => void) | undefined) {
      onArticleUpdateRef.current = callback;
    },
    // Article
    currentArticleId: article?.id || null,
    article,
    audioUri,
    playArticle,
    togglePlayPause,
    // Playlist
    playlistAudioUri,
    playlistTitle,
    playlistSubtitle,
    isPlaylistPlaying,
    playPlaylist,
    togglePlaylistPlayPause,
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

    