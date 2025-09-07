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
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full">
          <Image
            src={article.media.image}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="news article"
          />
        </div>
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <Badge variant="secondary">{article.category}</Badge>
            <span className="text-xs text-muted-foreground">{article.publishedAt}</span>
          </div>
          <CardTitle className="font-headline text-lg leading-tight">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">{summary}</p>
      </CardContent>
      <CardFooter className="p-2 bg-muted/50 dark:bg-card-foreground/5 flex justify-between">
        <Button variant="ghost" size="sm" onClick={handlePlay} disabled={isThisLoading}>
          {isThisLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Listen Smart
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => onAddToPodcast(article)} aria-label="Add to podcast">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Share">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
