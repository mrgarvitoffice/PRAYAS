
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { locationData } from '@/lib/data';
import type { Article, Language } from '@/lib/types';
import { NewsCard } from './news-card';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { AudioPlayer } from './audio-player';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Languages, Loader2, Menu, Newspaper, Podcast, Rss } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchAndProcessNews } from '@/ai/flows/fetch-and-process-news';
import { Badge } from '@/components/ui/badge';
import { SidebarFooter } from '@/components/ui/sidebar';

export function PrayasTerminal() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for active filters
  const [activeRegion, setActiveRegion] = useState('India');
  const [activeState, setActiveState] = useState('All India');
  const [activeCity, setActiveCity] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');

  // States for pending filter selections in sidebar
  const [pendingRegion, setPendingRegion] = useState(activeRegion);
  const [pendingState, setPendingState] = useState(activeState);
  const [pendingCity, setPendingCity] = useState(activeCity);
  const [pendingCategory, setPendingCategory] = useState(activeCategory);

  const [language, setLanguage] = useState<Language>('en');
  const [podcastList, setPodcastList] = useState<Article[]>([]);
  const [isPodcastModalOpen, setIsPodcastModalOpen] = useState(false);
  const { toast } = useToast();

  const states = useMemo(() => Object.keys(locationData[pendingRegion] ? locationData[pendingRegion].states : {}), [pendingRegion]);
  const cities = useMemo(() => (pendingRegion === 'India' && pendingState && locationData.India.states[pendingState]) ? locationData.India.states[pendingState] : [], [pendingRegion, pendingState]);

  const loadNews = useCallback(async (category: string, region: string, state: string, city: string) => {
    setIsLoading(true);
    try {
      const countryCode = region === 'World' ? 'us' : 'in';
      const fetchedArticles = await fetchAndProcessNews({ category, country: countryCode, state, city });
      setArticles(fetchedArticles);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load news',
        description: 'Could not fetch the latest articles. Please try again later.',
      });
       setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadNews(activeCategory, activeRegion, activeState, activeCity);
  }, [activeCategory, activeRegion, activeState, activeCity, loadNews]);

  const applyFilters = () => {
    setActiveRegion(pendingRegion);
    setActiveCategory(pendingCategory);
    setActiveState(pendingState);
    setActiveCity(pendingCity);
  };

  const handleRegionChange = (value: string) => {
    setPendingRegion(value);
    setPendingState(value === 'India' ? 'All India' : 'All');
    setPendingCity('All');
  };

  const handleStateChange = (value: string) => {
    setPendingState(value);
    setPendingCity('All');
  };

  const addToPodcast = (article: Article) => {
    if (!podcastList.find(p => p.id === article.id)) {
      setPodcastList(prev => [...prev, article]);
      toast({
        title: "Added to Podcast",
        description: `"${language === 'hi' ? article.titleHi : article.title}" has been added to your episode.`,
      });
    }
  };

  const createPodcast = () => {
    if (podcastList.length > 0) {
      setIsPodcastModalOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "No Articles Selected",
        description: "Please add articles to your podcast episode first.",
      });
    }
  };

  const filterPanel = (
    <>
      <SidebarHeader>
        <h2 className="text-lg font-semibold font-headline px-2">Filters</h2>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea>
          <SidebarGroup>
            <label className="text-sm font-medium">Region</label>
            <Select value={pendingRegion} onValueChange={handleRegionChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="World">World</SelectItem>
              </SelectContent>
            </Select>
          </SidebarGroup>
          <SidebarGroup>
            <label className="text-sm font-medium">State</label>
            <Select value={pendingState} onValueChange={handleStateChange} disabled={pendingRegion !== 'India'}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </SidebarGroup>
          <SidebarGroup>
            <label className="text-sm font-medium">City</label>
            <Select value={pendingCity} onValueChange={setPendingCity} disabled={!cities || cities.length === 0}>
              <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Cities</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </SidebarGroup>
          <SidebarGroup>
            <label className="text-sm font-medium">Category</label>
            <Select value={pendingCategory} onValueChange={setPendingCategory}>
              <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="Politics">Politics</SelectItem>
                <SelectItem value="Economy">Economy</SelectItem>
                <SelectItem value="Environment">Environment</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Sports">Sports</SelectItem>
                <SelectItem value="Entertainment">Entertainment</SelectItem>
              </SelectContent>
            </Select>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <Button onClick={applyFilters} className="w-full">Apply Filters</Button>
      </SidebarFooter>
    </>
  );

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="w-72">
        {filterPanel}
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-40 w-full border-b bg-background">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu/>
                  </Button>
                </SidebarTrigger>
                <Logo />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={createPodcast}>
                  <Podcast className="mr-2 h-4 w-4" />
                  Create Podcast
                  {podcastList.length > 0 && <Badge variant="default" className="ml-2">{podcastList.length}</Badge>}
                </Button>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger className="w-auto gap-2">
                    <Languages className="h-4 w-4"/>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिंदी</SelectItem>
                  </SelectContent>
                </Select>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 container mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold font-headline">Top Stories</h1>
              <Button variant="outline" size="icon" className="hidden md:flex" onClick={() => {
                  const trigger = document.querySelector('[data-sidebar="trigger"]');
                  if (trigger instanceof HTMLElement) {
                    trigger.click();
                  }
              }}>
                <Menu/>
              </Button>
            </div>
            {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                  <h2 className="text-2xl font-bold font-headline mb-2">Fetching Latest News...</h2>
                  <p className="text-muted-foreground">Please wait while we gather and process the articles for you.</p>
              </div>
            ) : articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {articles.map(article => (
                  <NewsCard key={article.id} article={article} language={language} onAddToPodcast={addToPodcast} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <Newspaper className="w-16 h-16 text-muted-foreground mb-4" />
                  <h2 className="text-2xl font-bold font-headline mb-2">No Articles Found</h2>
                  <p className="text-muted-foreground">Try adjusting your filters to find what you're looking for.</p>
              </div>
            )}
          </main>
          <AudioPlayer language={language} />
        </div>
      </SidebarInset>

      <Dialog open={isPodcastModalOpen} onOpenChange={setIsPodcastModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Your Podcast Episode</DialogTitle>
            <DialogDescription>
              Here are the articles you've selected for your episode. You can reorder them and add an intro/outro before generating the audio.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto p-1">
            <ul className="space-y-2">
              {podcastList.map((article, index) => (
                <li key={article.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                  <span className="truncate pr-4">
                    {index + 1}. {language === 'hi' ? article.titleHi : article.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setIsPodcastModalOpen(false); setPodcastList([])}}>Clear List</Button>
            <Button>
              <Rss className="mr-2 h-4 w-4" />
              Generate Podcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
