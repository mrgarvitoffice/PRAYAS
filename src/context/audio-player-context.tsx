
"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Article, Language } from '@/lib/types';
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
  const { toast } = useToast();
  
  const onArticleUpdateRef = useRef<(article: Article) => void>();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);


  const stop = useCallback(() => {
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
    setArticle(null);
    setIsLoading(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (utteranceRef.current) {
      if (isPlaying) {
        window.speechSynthesis.pause();
      } else {
        window.speechSynthesis.resume();
      }
      setIsPlaying(!isPlaying);
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
         if (onArticleUpdateRef.current) {
            onArticleUpdateRef.current(updatedArticle);
        }
        return updatedArticle;

      } catch (e) {
          console.error("Error during summarization:", e);
          toast({ variant: 'destructive', title: 'Summarization Failed', description: e instanceof Error ? e.message : 'Could not process article.' });
          return null; // Return null on failure
      }
    }
    
    return updatedArticle; // Return article if no processing was needed
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
        const bestVoice = voices.find(v => v.lang === langCode && v.name.includes('Google')) ||
                          voices.find(v => v.lang === langCode && v.name.includes('Natural')) ||
                          voices.find(v => v.lang === langCode && v.localService) ||
                          voices.find(v => v.lang === langCode);

        if (bestVoice) {
            utterance.voice = bestVoice;
        }

        utterance.onstart = () => setIsPlaying(true);
        utterance.onpause = () => setIsPlaying(false);
        utterance.onresume = () => setIsPlaying(true);
        utterance.onend = stop;
        utterance.onerror = (e) => {
            console.error("Speech synthesis error", e);
            toast({ variant: 'destructive', title: 'Playback Error', description: 'Could not play audio using browser TTS.' });
            stop();
        };
        
        // This is required on some browsers to ensure voices are loaded
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.speak(utterance);
            };
        } else {
             window.speechSynthesis.speak(utterance);
        }

    } catch (error) {
      console.error('Playback failed:', error);
      toast({ variant: 'destructive', title: 'Playback Error', description: error instanceof Error ? error.message : 'Could not play audio.' });
      stop();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, article, processAndCacheArticle, stop, togglePlayPause, toast]);


  // Placeholder for seek as Web Speech API doesn't support it well.
  const seek = useCallback((newProgress: number) => {
    console.warn("Seek is not supported for browser-based text-to-speech.");
  }, []);

  const value: AudioPlayerContextType = {
    currentArticleId: article?.id || null,
    article,
    isPlaying,
    isLoading,
    progress: 0, // Progress is not tracked for browser TTS
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
