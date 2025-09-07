"use client";

import Image from 'next/image';
import { Bookmark, Loader2, Play, Plus, Share2 } from 'lucide-react';
import { useAudioPlayer } from '@/context/audio-player-context';
import type { Article, Language } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NewsCardProps {
  article: Article;
  language: Language;
  onAddToPodcast: (article: Article) => void;
}

export function NewsCard({ article, language, onAddToPodcast }: NewsCardProps) {
  const { playArticle, currentArticle, isPlaying, isLoading } = useAudioPlayer();
  const { toast } = useToast();

  const isCurrentArticle = currentArticle?.id === article.id;
  const isThisLoading = isCurrentArticle && isLoading;

  const handlePlay = () => {
    playArticle(article, language);
  };
  
  const handleShare = () => {
    navigator.clipboard.writeText(article.contentUrl);
    toast({
      title: "Link Copied!",
      description: "Article link copied to clipboard.",
    });
  };

  const title = language === 'hi' ? article.titleHi : article.title;
  const summary = language === 'hi' ? article.summaryHi : article.summary;

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
       <CardHeader className="p-0 relative">
        <a href={article.contentUrl} target="_blank" rel="noopener noreferrer">
          <div className="relative h-48 w-full">
            <Image
              src={article.media.image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint="news article"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </a>
        <div className="absolute top-2 right-2 flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/20 text-white hover:bg-white/30 hover:text-white" onClick={() => onAddToPodcast(article)} aria-label="Add to podcast">
                <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/20 text-white hover:bg-white/30 hover:text-white" onClick={handleShare} aria-label="Share">
                <Share2 className="h-4 w-4" />
            </Button>
        </div>
        <div className="absolute bottom-0 left-0 p-4">
             <Badge variant="secondary" className="mb-2">{article.category}</Badge>
             <CardTitle className="font-headline text-lg leading-tight text-white">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <div className="flex justify-between items-start text-xs text-muted-foreground mb-3">
            <span>{article.source.name}</span>
            <span>{article.publishedAt}</span>
        </div>
        <p className="text-sm text-foreground/80 line-clamp-3">{summary}</p>
      </CardContent>
      <CardFooter className="p-3 bg-muted/30 dark:bg-card-foreground/5 flex justify-between items-center">
        <Button variant="default" size="sm" onClick={handlePlay} disabled={isThisLoading} className="w-full">
          {isThisLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Listen Smart
        </Button>
      </CardFooter>
    </Card>
  );
}
