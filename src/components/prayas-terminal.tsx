"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { articles as allArticles, locationData } from '@/lib/data';
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
import { Separator } from './ui/separator';
import { Languages, Newspaper, Podcast, Rss } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PrayasTerminal() {
  const [filteredArticles, setFilteredArticles] = useState<Article[]>(allArticles);
  const [region, setRegion] = useState('India');
  const [state, setState] = useState('All India');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [podcastList, setPodcastList] = useState<Article[]>([]);
  const [isPodcastModalOpen, setIsPodcastModalOpen] = useState(false);
  const { toast } = useToast();

  const states = useMemo(() => Object.keys(locationData[region] ? locationData[region].states : {}), [region]);
  const cities = useMemo(() => (region === 'India' && state && locationData.India.states[state]) ? locationData.India.states[state] : [], [region, state]);

  useEffect(() => {
    let result = allArticles;

    if (region !== 'World') {
      result = result.filter(a => a.country === 'India');
      if (state && state !== 'All India') {
        result = result.filter(a => a.state === state);
        if (city) {
          result = result.filter(a => a.city === city);
        }
      }
    } else {
      result = result.filter(a => a.country === 'World');
    }

    if (category) {
      result = result.filter(a => a.category === category);
    }

    setFilteredArticles(result);
  }, [region, state, city, category]);

  const handleRegionChange = (value: string) => {
    setRegion(value);
    setState(value === 'India' ? 'All India' : '');
    setCity('');
  };

  const handleStateChange = (value: string) => {
    setState(value);
    setCity('');
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
        <h2 className="text-lg font-semibold font-headline">Filters</h2>
      </SidebarHeader>
      <SidebarContent asChild>
        <ScrollArea>
          <SidebarGroup>
            <label className="text-sm font-medium">Region</label>
            <Select value={region} onValueChange={handleRegionChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="World">World</SelectItem>
              </SelectContent>
            </Select>
          </SidebarGroup>
          <SidebarGroup>
            <label className="text-sm font-medium">State</label>
            <Select value={state} onValueChange={handleStateChange} disabled={region !== 'India'}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </SidebarGroup>
          <SidebarGroup>
            <label className="text-sm font-medium">City</label>
            <Select value={city} onValueChange={setCity} disabled={!cities.length}>
              <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Cities</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </SidebarGroup>
          <SidebarGroup>
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="Politics">Politics</SelectItem>
                <SelectItem value="Economy">Economy</SelectItem>
                <SelectItem value="Environment">Environment</SelectItem>
              </SelectContent>
            </Select>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </>
  );

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="w-72">
        {filterPanel}
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-primary to-indigo-400 dark:from-primary dark:to-indigo-800 shadow-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-primary-foreground hover:bg-white/20" />
                <Logo />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="text-primary-foreground hover:bg-white/20" onClick={createPodcast}>
                  <Podcast className="mr-2 h-5 w-5" />
                  Create Podcast
                  {podcastList.length > 0 && <Badge variant="destructive" className="ml-2">{podcastList.length}</Badge>}
                </Button>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger className="w-auto gap-2 border-0 bg-transparent text-primary-foreground hover:bg-white/20 focus:ring-0 focus:ring-offset-0">
                    <Languages className="h-5 w-5"/>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिंदी</SelectItem>
                  </SelectContent>
                </Select>
                <ThemeToggle className="text-primary-foreground hover:bg-white/20" />
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 container mx-auto">
            {filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredArticles.map(article => (
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
            <Button onClick={() => {setIsPodcastModalOpen(false); setPodcastList([])}}>Clear List</Button>
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
