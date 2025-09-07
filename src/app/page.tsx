
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  Globe,
  MapPin,
  Calendar,
  ExternalLink,
  AlertCircle,
  Languages,
  Play,
  Podcast,
  Loader2,
  Rss,
  Plus,
  Download,
  Headphones,
  Info,
  ListMusic,
  Trash2,
  StopCircle,
  Pause,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Article, Language } from '@/lib/types';
import { fetchAndProcessNews } from '@/ai/flows/fetch-and-process-news';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { translateAndSummarizeArticleHindi } from '@/ai/flows/translate-and-summarize-article-hindi';
import { generatePodcastFromArticles } from '@/ai/flows/generate-podcast-from-articles';
import { useAudioPlayer } from '@/context/audio-player-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const INDIAN_STATES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Jorhat', 'Silchar'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Darbhanga'],
  'Chhattisgarh': ['Raipur', 'Bilaspur', 'Korba', 'Durg'],
  'Delhi': ['New Delhi', 'Delhi'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur'],
  'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol']
};

const NewsApp = () => {
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    region: 'india', // 'india', 'world'
    state: '',
    city: '',
    category: '',
    search: '',
    language: 'en' as Language,
  });
  const { toast } = useToast();
  const audioPlayer = useAudioPlayer();

  const [isPodcastModalOpen, setIsPodcastModalOpen] = useState(false);
  const [podcastLanguage, setPodcastLanguage] = useState<'en' | 'hi' | 'bilingual'>('en');
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [generatedPodcastAudio, setGeneratedPodcastAudio] = useState<string | null>(null);

  const [isSpeakingHeadlines, setIsSpeakingHeadlines] = useState(false);
  const [isPausedHeadlines, setIsPausedHeadlines] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const handleVoicesChanged = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    handleVoicesChanged();
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
  }, []);
  
  const handleArticleUpdate = useCallback((updatedArticle: Article) => {
    setNews(prevNews => prevNews.map(a => a.id === updatedArticle.id ? updatedArticle : a));
  }, []);
  
  const fetchNewsCallback = useCallback(async (currentFilters: typeof filters) => {
    setLoading(true);
    setError('');
    try {
      const countryCode = currentFilters.region === 'world' ? 'us' : 'in';
      let fetchedArticles = await fetchAndProcessNews({
        category: currentFilters.category || 'top',
        country: countryCode,
        state: currentFilters.state || undefined,
        city: currentFilters.city || undefined,
      });
      
      let processedArticles = fetchedArticles.filter(a => a.title && (a.rawContent || a.summary));
      
      if (currentFilters.search.trim()) {
          const searchTerm = currentFilters.search.trim().toLowerCase();
          processedArticles = processedArticles.filter(article => 
              article.title.toLowerCase().includes(searchTerm) ||
              (article.summary && article.summary.toLowerCase().includes(searchTerm))
          );
      }
      
      setNews(processedArticles); 

      if (processedArticles.length === 0) {
        setError('No news articles found for the selected filters.');
      }

    } catch (err) {
      console.error('Error fetching news:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to load news: ${errorMessage}`);
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      if (filterType === 'region') {
        newFilters.state = '';
        newFilters.city = '';
      } else if (filterType === 'state') {
        newFilters.city = '';
      }
      return newFilters;
    });
  }, []);
  
  useEffect(() => {
    const handler = setTimeout(() => {
        fetchNewsCallback(filters);
    }, 500); 
    return () => clearTimeout(handler);
  }, [filters.search, filters.region, filters.state, filters.city, filters.category, fetchNewsCallback]);


  const clearFilters = () => {
    const newFilters = {
      region: 'india',
      state: '',
      city: '',
      category: '',
      search: '',
      language: 'en' as Language,
    };
    setFilters(newFilters);
    fetchNewsCallback(newFilters);
  };

  const availableCities = useMemo(() => {
    if (!filters.state || filters.region !== 'india') return [];
    return INDIAN_STATES[filters.state] || [];
  }, [filters.state, filters.region]);
  
  const handleCreatePodcast = () => {
    if (news.length > 0) {
      setGeneratedPodcastAudio(null);
      setIsPodcastModalOpen(true);
    } else {
       toast({
        variant: "destructive",
        title: "No Articles Available",
        description: "There are no news articles to create a podcast from.",
      });
    }
  };

  const handleGeneratePodcast = async () => {
    if (news.length === 0) return;
    setIsGeneratingPodcast(true);
    setGeneratedPodcastAudio(null);
    try {
      toast({ title: 'Generating your podcast...', description: 'This may take a minute or two.' });
      
      const articlesForPodcast = await Promise.all(
        news.map(async (article) => {
          if ((podcastLanguage === 'hi' || podcastLanguage === 'bilingual') && !article.titleHi) {
             const hindiSummary = await translateAndSummarizeArticleHindi({
                articleTitle: article.title,
                articleContent: article.rawContent,
              });
              const processedArticle = {
                ...article,
                titleHi: hindiSummary.translatedTitle,
                summaryHi: hindiSummary.summaryPoints.join(' '),
                importantPointsHi: hindiSummary.summaryPoints,
              };
              handleArticleUpdate(processedArticle);
              return processedArticle;
          }
          return article;
        })
      );
      
      const result = await generatePodcastFromArticles({ articles: articlesForPodcast, language: podcastLanguage });
      setGeneratedPodcastAudio(result.audioDataUri);
      toast({ title: 'Podcast generated successfully!', description: 'You can now play or download it.' });
    } catch (e) {
      console.error("Error generating podcast", e);
      toast({
        variant: "destructive",
        title: "Podcast Generation Failed",
        description: e instanceof Error ? e.message : 'An unknown error occurred.',
      });
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  const readAllHeadlines = useCallback(() => {
    if (isSpeakingHeadlines && !isPausedHeadlines) {
      window.speechSynthesis.pause();
      setIsPausedHeadlines(true);
      return;
    }
    
    if (isPausedHeadlines) {
      window.speechSynthesis.resume();
      setIsPausedHeadlines(false);
      return;
    }

    const headlines = news
      .map(a => filters.language === 'hi' && a.titleHi ? a.titleHi : a.title)
      .filter(Boolean)
      .join('. ');
      
    if (!headlines) {
      toast({ title: 'No headlines to read', description: 'There are no articles with headlines to read out.' });
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(headlines);
    utteranceRef.current = utterance;

    const langCode = filters.language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.lang = langCode;

    // Find the best voice
    const voice = voices.find(v => v.name.includes('Google') && v.lang === langCode) ||
                  voices.find(v => v.name.includes('Natural') && v.lang.startsWith(filters.language)) ||
                  voices.find(v => v.lang === langCode && v.localService) ||
                  voices.find(v => v.lang === langCode);

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      setIsSpeakingHeadlines(true);
      setIsPausedHeadlines(false);
    };

    utterance.onend = () => {
      setIsSpeakingHeadlines(false);
      setIsPausedHeadlines(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        toast({
            variant: "destructive",
            title: "Speech Error",
            description: `Could not read headlines. Error: ${event.error}`,
        });
        setIsSpeakingHeadlines(false);
        setIsPausedHeadlines(false);
    };

    window.speechSynthesis.speak(utterance);

  }, [news, filters.language, toast, voices, isSpeakingHeadlines, isPausedHeadlines]);
  
  const stopReadingHeadlines = () => {
    if (utteranceRef.current) {
        window.speechSynthesis.cancel();
        setIsSpeakingHeadlines(false);
        setIsPausedHeadlines(false);
        utteranceRef.current = null;
    }
  }
  
  useEffect(() => {
    // Cleanup speech synthesis on component unmount or filter change
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white font-headline tracking-tight">
                Prayas News Terminal
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Your AI-powered daily briefing for current affairs.
              </p>
            </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" onClick={readAllHeadlines} disabled={news.length === 0 || audioPlayer.isPlaying}>
                    {isSpeakingHeadlines && !isPausedHeadlines ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isSpeakingHeadlines && !isPausedHeadlines ? 'Pause' : isPausedHeadlines ? 'Resume' : 'Read Headlines'}
                </Button>
                {(isSpeakingHeadlines || isPausedHeadlines) && (
                  <Button variant="outline" size="icon" onClick={stopReadingHeadlines}>
                    <StopCircle className="h-5 w-5" />
                  </Button>
                )}
              <Button variant="outline" onClick={handleCreatePodcast} disabled={news.length === 0}>
                <Podcast className="mr-2 h-4 w-4" />
                Create Podcast
              </Button>
              <ThemeToggle />
            </div>
          </header>

          <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="lg:col-span-2 xl:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <Search className="w-4 h-4 inline mr-1" />
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search by keyword..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Region
                </label>
                <select
                  value={filters.region}
                  onChange={(e) => handleFilterChange('region', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="india">India</option>
                  <option value="world">World</option>
                </select>
              </div>
              {filters.region === 'india' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <MapPin className="w-4 h-4 inline mr-1" /> State
                    </label>
                    <select
                      value={filters.state}
                      onChange={(e) => handleFilterChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All States</option>
                      {Object.keys(INDIAN_STATES).map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                    <select
                      value={filters.city}
                      onChange={(e) => handleFilterChange('city', e.target.value)}
                      disabled={!filters.state}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="">All Cities</option>
                      {availableCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All</option>
                  <option value="politics">Politics</option>
                  <option value="business">Business</option>
                  <option value="technology">Technology</option>
                  <option value="sports">Sports</option>
                </select>
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <Languages className="w-4 h-4 inline mr-1" />
                  Language
                </label>
                <select
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading news...</p>
            </div>
          ) : error ? (
             <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error Loading News</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          ) : news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {news.map((article) => {
                const isCurrentlyPlaying = audioPlayer.currentArticle?.id === article.id && audioPlayer.isPlaying;
                const isCurrentlyLoading = audioPlayer.currentArticle?.id === article.id && audioPlayer.isLoading;
                
                const title = filters.language === 'hi' && article.titleHi ? article.titleHi : article.title;
                const summary = filters.language === 'hi' && article.summaryHi ? article.summaryHi : article.summary;

                const needsProcessing = (filters.language === 'en' && article.importantPoints.length === 0) || (filters.language === 'hi' && !article.titleHi);

                return (
                  <article
                    key={article.id}
                    className={cn(
                      "bg-white dark:bg-slate-800/50 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700/50 group",
                      isCurrentlyPlaying && "ring-2 ring-indigo-500"
                    )}
                  >
                    {article.media.image && (
                      <div className="relative h-48 w-full overflow-hidden">
                        <a href={article.contentUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={article.media.image}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://picsum.photos/600/400?random=${article.id}`;
                            }}
                          />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </a>
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight mb-3 font-headline line-clamp-3">
                         <a href={article.contentUrl} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {title}
                         </a>
                      </h2>
                       <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                        {article.source.name && (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{article.source.name}</span>
                        )}
                         <span className="text-slate-400 dark:text-slate-500">•</span>
                        {article.publishedAt && (
                          <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /><span>{article.publishedAt}</span></div>
                        )}
                       
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-4 flex-1">
                        {summary}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/50">
                      <div className="flex items-center gap-2">
                         <button onClick={() => audioPlayer.playArticle(article, filters.language)} disabled={isCurrentlyLoading || isSpeakingHeadlines} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Listen to Article">
                            {isCurrentlyLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Headphones className="w-5 h-5"/>}
                         </button>
                         {needsProcessing && !article.audioDataUri && (
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Info className="w-4 h-4 text-blue-500 cursor-help" />
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Click Listen for an AI-powered summary!</p>
                             </TooltipContent>
                           </Tooltip>
                          )}

                         <a href={article.contentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1.5">
                            Read More <ExternalLink className="w-4 h-4" />
                         </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
             <div className="text-center py-20">
                <Rss className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No news found</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">Try adjusting your filters to find articles.</p>
              </div>
          )}
        </div>
        
         {/* Podcast Modal */}
        <Dialog open={isPodcastModalOpen} onOpenChange={setIsPodcastModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Your Podcast Episode</DialogTitle>
              <DialogDescription>
                {generatedPodcastAudio
                  ? 'Your podcast is ready! You can now play it below or download it.'
                  : `A podcast will be generated from the ${news.length} currently visible articles. Choose a language for the audio.`}
              </DialogDescription>
            </DialogHeader>

            {isGeneratingPodcast ? (
              <div className="flex flex-col items-center justify-center my-8">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="mt-4 text-slate-500">Generating your AI podcast, please wait...</p>
              </div>
            ) : generatedPodcastAudio ? (
              <div className="my-4 space-y-4">
                <audio controls src={generatedPodcastAudio} className="w-full">
                  Your browser does not support the audio element.
                </audio>
                <a
                  href={generatedPodcastAudio}
                  download="prayas-podcast.wav"
                  className={cn(
                    'w-full',
                    buttonVariants({ variant: 'outline' })
                  )}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Podcast
                </a>
              </div>
            ) : (
              <>
                <div className="max-h-60 overflow-y-auto p-1 my-4 border rounded-md">
                  <ul className="space-y-2">
                    {news.map((article, index) => (
                      <li key={article.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <span className="truncate pr-4 text-sm">
                          {index + 1}. {filters.language === 'hi' && article.titleHi ? article.titleHi : article.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Podcast Language</label>
                  <select
                    value={podcastLanguage}
                    onChange={(e) => setPodcastLanguage(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="bilingual">Bilingual (English+Hindi)</option>
                  </select>
                </div>
              </>
            )}

            <DialogFooter className='mt-4'>
              <Button variant="outline" onClick={() => { setIsPodcastModalOpen(false); setGeneratedPodcastAudio(null); }}>
                {generatedPodcastAudio ? 'Close' : 'Cancel'}
              </Button>
              {!generatedPodcastAudio && (
                <Button onClick={handleGeneratePodcast} disabled={isGeneratingPodcast}>
                  {isGeneratingPodcast ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rss className="mr-2 h-4 w-4" />}
                  Generate Podcast
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};


export default function Home() {
  return <NewsApp />;
}

    