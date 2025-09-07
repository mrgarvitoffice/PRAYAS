"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, X, Globe, MapPin, Calendar, ExternalLink, AlertCircle } from 'lucide-react';

// Constants
const NEWS_API_KEY = "pub_1a130cb7e5ea4cf7adf30cfca80b4199";
const NEWS_API_BASE_URL = "https://newsdata.io/api/1/news";

// Indian states and major cities
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
  const [news, setNews] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [filters, setFilters] = React.useState({
    region: 'india', // 'india', 'world'
    state: '',
    city: '',
    category: '',
    search: ''
  });
  const [nextPage, setNextPage] = React.useState<string | null>(null);
  const [seenArticles, setSeenArticles] = React.useState(new Set());

  // Get unique articles (prevent duplicates)
  const getUniqueArticles = (articles: any[]) => {
    const uniqueArticles: any[] = [];
    const seen = new Set(seenArticles);
    
    articles.forEach(article => {
      // Create unique identifier using title and description
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
    
    // Handle region filter
    if (filters.region === 'india') {
      url += '&country=in';
    } else if (filters.region === 'world') {
      // For world news, exclude India to avoid duplicates
      url += '&country=us,gb,ca,au,fr,de,jp,cn,br,mx';
    }
    
    let queryParts = [];

    // Add location-based search
    if (filters.state) {
        queryParts.push(`"${filters.state}"`);
    }
    if (filters.city) {
        queryParts.push(`"${filters.city}"`);
    }
    
    // Add search query
    if (filters.search.trim()) {
        queryParts.push(`"${filters.search.trim()}"`);
    }

    if (queryParts.length > 0) {
        url += `&q=${encodeURIComponent(queryParts.join(' AND '))}`;
    }

    // Add category filter
    if (filters.category) {
      url += `&category=${filters.category}`;
    }
    
    // Add pagination
    if (isLoadMore && nextPage) {
      url += `&page=${nextPage}`;
    }
    
    return url;
  };

  // Fetch news from API
  const fetchNews = React.useCallback(async (isLoadMore = false) => {
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
        // API errors can sometimes be in data.results.message
        const errorMessage = data.results?.message || data.message || 'Failed to fetch news';
        throw new Error(errorMessage);
      }
      
      if (!data.results || data.results.length === 0) {
        if (!isLoadMore) {
          setNews([]);
        }
        setNextPage(null); // No more pages
        if(!isLoadMore) setError('No news articles found for the selected filters.');
        return;
      }
      
      const uniqueArticles = getUniqueArticles(data.results);
      
      if (isLoadMore) {
        setNews(prev => [...prev, ...uniqueArticles]);
      } else {
        setNews(uniqueArticles);
        setSeenArticles(new Set(uniqueArticles.map(a => `${a.title?.toLowerCase().trim()}-${a.description?.toLowerCase().slice(0, 100).trim()}`))); // Reset seen articles for new search
      }
      
      setNextPage(data.nextPage);
      
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setError(`Failed to load news: ${err.message}`);
      if (!isLoadMore) {
        setNews([]);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, nextPage, loading]); // Add dependencies

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      // Clear dependent filters when parent changes
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
      search: ''
    });
    setSeenArticles(new Set());
  };

  // Get available cities for selected state
  const availableCities = React.useMemo(() => {
    if (!filters.state || filters.region !== 'india') return [];
    return INDIAN_STATES[filters.state] || [];
  }, [filters.state, filters.region]);

  // Load news when filters change (debounced)
    React.useEffect(() => {
        const handler = setTimeout(() => {
            fetchNews();
        }, 500); // Debounce API calls

        return () => {
            clearTimeout(handler);
        };
    }, [filters.region, filters.state, filters.city, filters.category, filters.search]);


  // Initial load
  React.useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">News Central</h1>
          <p className="text-gray-600 dark:text-gray-400">Stay updated with the latest news from India and around the world</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

            {/* State Filter - Only show for India */}
            {filters.region === 'india' && (
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
            )}

            {/* City Filter - Only show when state is selected */}
            {filters.region === 'india' && filters.state && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City
                </label>
                <select
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Cities</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
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
                <option value="">All Categories</option>
                <option value="politics">Politics</option>
                <option value="business">Business</option>
                <option value="technology">Technology</option>
                <option value="sports">Sports</option>
                <option value="entertainment">Entertainment</option>
                <option value="health">Health</option>
                <option value="science">Science</option>
              </select>
            </div>

            {/* Search Filter */}
            <div className="lg:col-span-2">
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

        {/* Active Filters Display */}
        {(filters.state || filters.city || filters.category || filters.search) && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
              {filters.state && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  State: {filters.state}
                  <button
                    onClick={() => handleFilterChange('state', '')}
                    className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.city && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  City: {filters.city}
                  <button
                    onClick={() => handleFilterChange('city', '')}
                    className="ml-2 text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  Category: {filters.category}
                  <button
                    onClick={() => handleFilterChange('category', '')}
                    className="ml-2 text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Search: "{filters.search}"
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="ml-2 text-yellow-600 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error Loading News</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && news.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading news...</p>
          </div>
        )}

        {/* News Articles */}
        {news.length > 0 && (
          <div className="space-y-6">
            {news.map((article, index) => (
              <article
                key={`${article.article_id || index}-${article.title?.slice(0, 50)}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Article Image */}
                  {article.image_url && (
                    <div className="lg:w-64 flex-shrink-0">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-48 lg:h-32 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Article Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight hover:text-blue-600 dark:hover:text-blue-400">
                        {article.title}
                      </h2>
                      {article.link && (
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                    
                    {article.description && (
                      <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                        {article.description}
                      </p>
                    )}
                    
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                      {article.source_id && (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {article.source_id}
                        </span>
                      )}
                      
                      {article.pubDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(article.pubDate).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      
                      {article.category && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-xs capitalize">
                          {Array.isArray(article.category) ? article.category.join(', ') : article.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {news.length > 0 && nextPage && !loading && (
          <div className="text-center mt-8">
            <button
              onClick={() => fetchNews(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Load More News
            </button>
          </div>
        )}

        {/* Loading More State */}
        {loading && news.length > 0 && (
          <div className="text-center mt-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading more news...</p>
          </div>
        )}

        {/* No Results */}
        {!loading && news.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No news found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your filters or search terms to find more articles.
            </p>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  return <NewsApp />;
}
