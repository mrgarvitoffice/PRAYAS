"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Plus,
  Loader2,
  Podcast,
  Rss,
  Pause,
  StopCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { summarizeArticle } from '@/ai/flows/summarize-article';
import { translateAndSummarizeArticleHindi } from '@/ai/flows/translate-and-summarize-article-hindi';
import { generateTTSAudioClip } from '@/ai/flows/generate-tts-audio-clip';

// Constants
const NEWS_API_KEY = "pub_1a130cb7e5ea4cf7adf30cfca80b4199";
const NEWS_API_BASE_URL = "https://newsdata.io/api/1/news";

// Indian states and major cities
const INDIAN_STATES = {
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
  const [news, setNews] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [filters, setFilters] = React.useState({
    region: 'india', // 'india', 'world'
    state: '',
    city: '',
    category: '',
    search: '',
    language: 'en'
  });
  const [nextPage, setNextPage] = React.useState(null);
  const [seenArticles, setSeenArticles] = React.useState(new Set());
  const { toast } = useToast();

  // Podcast State
  const [podcastList, setPodcastList] = useState([]);
  const [isPodcastModalOpen, setIsPodcastModalOpen] = useState(false);
  const [podcastLanguage, setPodcastLanguage] = useState('en');

  // Audio Player State
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    isLoading: false,
    currentArticleId: null,
    audioUrl: null,
    progress: 0,
  });
  const audioRef = useRef(null);

  // Setup Audio Element
  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setAudioState(s => ({ ...s, progress: (audio.currentTime / audio.duration) * 100 }));
      }
    };
    const handleEnded = () => {
      setAudioState(s => ({ ...s, isPlaying: false, currentArticleId: null, progress: 0 }));
    };
    const handlePlay = () => setAudioState(s => ({ ...s, isPlaying: true }));
    const handlePause = () => setAudioState(s => ({ ...s, isPlaying: false }));

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Get unique articles (prevent duplicates)
  const getUniqueArticles = (articles) => {
    const uniqueArticles = [];
    const seen = new Set(seenArticles);

    articles.forEach(article => {
      const identifier = `${article.title?.toLowerCase().trim()}-${article.description?.toLowerCase().slice(0, 100).trim()}`;
      if (!seen.has(identifier) && article.title && article.title.trim() !== '') {
        seen.add(identifier);
        uniqueArticles.push(article);
      }
    });

    setSeenArticles(seen);
    return uniqueArticles;
  };

  // Build API URL based on filters
  const buildApiUrl = (isLoadMore = false) => {
    let url = `${NEWS_API_BASE_URL}?apikey=${NEWS_API_KEY}&size=10&language=en`;

    if (filters.region === 'india') {
      url += '&country=in';
    } else if (filters.region === 'world') {
      url += '&country=us,gb,ca,au,de';
    }

    let queryParts = [];
    if (filters.state) queryParts.push(`"${filters.state}"`);
    if (filters.city) queryParts.push(`"${filters.city}"`);
    if (filters.search.trim()) queryParts.push(`"${filters.search.trim()}"`);

    if (queryParts.length > 0) {
      url += `&q=${encodeURIComponent(queryParts.join(' AND '))}`;
    }

    if (filters.category) {
      url += `&category=${filters.category}`;
    }

    if (isLoadMore && nextPage) {
      url += `&page=${nextPage}`;
    }

    return url;
  };
  
  const fetchNewsCallback = useCallback(async (isLoadMore = false) => {
    if (loading && !isLoadMore) return;

    setLoading(true);
    if (!isLoadMore) {
        setError('');
    }

    try {
        const url = buildApiUrl(isLoadMore);
        console.log('Fetching from:', url);

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'error') {
            const errorMessage = data.results?.message || 'Failed to fetch news';
            throw new Error(errorMessage);
        }

        if (!data.results || data.results.length === 0) {
            if (!isLoadMore) setNews([]);
            setNextPage(null);
            if (!isLoadMore) setError('No news articles found for the selected filters.');
            return;
        }

        const uniqueArticles = getUniqueArticles(data.results);

        if (isLoadMore) {
            setNews(prev => [...prev, ...uniqueArticles]);
        } else {
            setNews(uniqueArticles);
            setSeenArticles(new Set(uniqueArticles.map(a => `${a.title?.toLowerCase().trim()}-${a.description?.toLowerCase().slice(0, 100).trim()}`)));
        }

        setNextPage(data.nextPage);

    } catch (err) {
        console.error('Error fetching news:', err);
        setError(`Failed to load news: ${err.message}`);
        if (!isLoadMore) setNews([]);
    } finally {
        setLoading(false);
    }
  }, [filters, nextPage, loading]);


  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
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
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      region: 'india',
      state: '',
      city: '',
      category: '',
      search: '',
      language: 'en'
    });
    setSeenArticles(new Set());
  };

  const availableCities = useMemo(() => {
    if (!filters.state || filters.region !== 'india') return [];
    return INDIAN_STATES[filters.state] || [];
  }, [filters.state, filters.region]);

  useEffect(() => {
    const handler = setTimeout(() => {
        fetchNewsCallback();
    }, 500);

    return () => {
        clearTimeout(handler);
    };
  }, [filters.region, filters.state, filters.city, filters.category, filters.search]);


  // Initial load
  useEffect(() => {
    fetchNewsCallback();
  }, []);
  
  // Podcast handlers
  const handleAddToPodcast = (article) => {
    if (!podcastList.find(p => p.article_id === article.article_id)) {
        setPodcastList(prev => [...prev, article]);
        toast({
            title: "Added to Podcast",
            description: `"${article.title}" has been added to your episode.`,
        });
    }
  };

  const handleCreatePodcast = () => {
    if (podcastList.length > 0) {
        setIsPodcastModalOpen(true);
    } else {
        toast({
            variant: "destructive",
            title: "No Articles Selected",
            description: "Please add articles to your podcast episode first.",
        });
    }
  }

  // Listen handler
  const handleListen = async (article) => {
      const articleId = article.article_id;
      if (audioState.currentArticleId === articleId && audioState.isPlaying) {
          audioRef.current.pause();
          return;
      }
      
      if(audioState.currentArticleId === articleId) {
          audioRef.current.play();
          return;
      }

      setAudioState({ ...audioState, isLoading: true, currentArticleId: articleId, progress: 0 });
      toast({
          title: "Generating Smart Summary...",
          description: "Please wait while we process and prepare the audio.",
          duration: 10000,
      });

      try {
          const full_text = article.content || article.description || '';
          if (!full_text) {
              throw new Error("Article content is not available for summarization.");
          }

          let summaryData;
          if (filters.language === 'hi') {
              const result = await translateAndSummarizeArticleHindi({
                  articleTitle: article.title,
                  articleContent: full_text,
              });
              summaryData = { title: result.translatedTitle, importantPoints: result.summaryPoints };
          } else {
              const result = await summarizeArticle({
                  title: article.title,
                  full_text: full_text,
              });
              summaryData = { title: result.heading, importantPoints: result.important_points };
          }
          
          const ttsResult = await generateTTSAudioClip({
              title: summaryData.title,
              importantPoints: summaryData.importantPoints,
              language: filters.language === 'hi' ? 'hi-IN' : 'en-IN',
          });

          audioRef.current.src = ttsResult.audioDataUri;
          audioRef.current.play();
          setAudioState(s => ({ ...s, isLoading: false, audioUrl: ttsResult.audioDataUri }));

      } catch (err) {
          console.error('Error in listen flow:', err);
          toast({
              variant: 'destructive',
              title: 'Playback Failed',
              description: err.message || 'Could not process or generate the audio for this article.',
          });
          setAudioState({ isPlaying: false, isLoading: false, currentArticleId: null, audioUrl: null, progress: 0 });
      }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setAudioState({ isPlaying: false, isLoading: false, currentArticleId: null, audioUrl: null, progress: 0 });
  }

  const renderArticleTitle = (article) => {
    // This is a placeholder for language switching.
    // In a real app, you would have translated titles.
    if (filters.language === 'hi') {
      return `(हिं) ${article.title}`;
    }
    return article.title;
  }
  
  const renderArticleDescription = (article) => {
    // Placeholder for language switching.
    if (filters.language === 'hi') {
      return `(हिं) ${article.description}`;
    }
    return article.description;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline">News Central</h1>
                <p className="text-gray-600 dark:text-gray-400">Your daily brief, powered by AI</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleCreatePodcast} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                    <Podcast className="w-5 h-5"/>
                    <span>Create Podcast</span>
                    {podcastList.length > 0 && <span className="ml-2 bg-white text-purple-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{podcastList.length}</span>}
                </button>
            </div>
        </header>


        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 transition-colors duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Region
              </label>
              <select
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="india">India</option>
                <option value="world">World</option>
              </select>
            </div>

            {/* State & City Filters */}
            {filters.region === 'india' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    State
                  </label>
                  <select
                    value={filters.state}
                    onChange={(e) => handleFilterChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All States</option>
                    {Object.keys(INDIAN_STATES).map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City
                  </label>
                  <select
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    disabled={!filters.state}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">All Cities</option>
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="politics">Politics</option>
                <option value="business">Business</option>
                <option value="technology">Technology</option>
                <option value="sports">Sports</option>
                <option value="entertainment">Entertainment</option>
              </select>
            </div>
            
            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Languages className="w-4 h-4 inline mr-1" />
                Language
              </label>
              <select
                value={filters.language}
                onChange={(e) => handleFilterChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
            
            {/* Search Filter */}
            <div className={cn("lg:col-span-5", filters.region === 'india' ? 'lg:col-span-2' : '')}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search news..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && news.length === 0 && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading news...</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error Loading News</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* News Articles */}
        <div className="space-y-6">
          {news.map((article) => (
            <article
              key={article.article_id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row gap-6 p-6">
                {article.image_url && (
                  <div className="lg:w-64 flex-shrink-0">
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-48 lg:h-full object-cover rounded-lg"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-2 font-headline">
                    {renderArticleTitle(article)}
                  </h2>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {article.source_id && (
                      <span className="font-medium text-blue-600 dark:text-blue-400">{article.source_id}</span>
                    )}
                    {article.pubDate && (
                      <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{new Date(article.pubDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
                    )}
                    {article.category && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs capitalize">{article.category[0]}</span>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                    {renderArticleDescription(article.description)}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <button onClick={() => handleListen(article)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed" disabled={audioState.isLoading && audioState.currentArticleId !== article.article_id}>
                      {audioState.isLoading && audioState.currentArticleId === article.article_id ? <Loader2 className="w-5 h-5 animate-spin"/> : <Play className="w-5 h-5"/>}
                      <span>{audioState.isPlaying && audioState.currentArticleId === article.article_id ? 'Pause' : 'Listen'}</span>
                    </button>
                    <button onClick={() => handleAddToPodcast(article)} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <Plus className="w-5 h-5"/>
                    </button>
                </div>
                <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                  Read More <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* Load More & No Results */}
        <div className="text-center mt-8">
            {news.length > 0 && nextPage && !loading && (
                <button onClick={() => fetchNewsCallback(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    Load More News
                </button>
            )}
            {loading && news.length > 0 && (
                <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin"/>
                    <span>Loading more...</span>
                </div>
            )}
            {!loading && news.length === 0 && !error && (
                <div className="text-center py-12">
                    <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No news found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Try adjusting your filters to find more articles.</p>
                </div>
            )}
        </div>
      </div>
      
      {/* Audio Player */}
      {audioState.currentArticleId && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <button onClick={() => audioRef.current?.play()} className="p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                      {audioState.isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </button>
                    <div className="flex-1">
                        <p className="font-bold truncate text-gray-900 dark:text-gray-100">
                            {news.find(a => a.article_id === audioState.currentArticleId)?.title}
                        </p>
                        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                          <div className="absolute top-0 left-0 h-2 bg-blue-600 rounded-full" style={{ width: `${audioState.progress}%` }}></div>
                        </div>
                    </div>
                    <button onClick={handleStopAudio} className="p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <StopCircle className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Podcast Modal */}
      {isPodcastModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-headline">Create Podcast Episode</h2>
                      <button onClick={() => setIsPodcastModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="space-y-4">
                      <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {podcastList.map((article, index) => (
                              <li key={article.article_id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-between">
                                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{index + 1}. {article.title}</span>
                              </li>
                          ))}
                      </ul>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Podcast Language</label>
                          <select value={podcastLanguage} onChange={e => setPodcastLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md">
                              <option value="en">English</option>
                              <option value="hi">Hindi</option>
                              <option value="bilingual">Bilingual (English+Hindi)</option>
                          </select>
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                          <button onClick={() => { setIsPodcastModalOpen(false); setPodcastList([]); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Clear List</button>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                              <Rss className="w-5 h-5"/>
                              Generate Podcast
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default function Home() {
  return <NewsApp />;
}
