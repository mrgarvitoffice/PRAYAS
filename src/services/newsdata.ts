
'use server';

/**
 * @fileOverview A service for fetching news articles from the NewsData.io API.
 */
import type { NewsDataResponse } from '@/lib/types';

const API_BASE_URL = 'https://newsdata.io/api/1/news';

/**
 * Fetches news articles from the NewsData.io API.
 * @param category The search category for articles.
 * @param country The country to fetch news from.
 * @param state The state to fetch news from.
 * @param city The city to fetch news from.
 * @returns A promise that resolves to the API response.
 */
export async function fetchNews(
  category: string = 'top',
  country: string = 'in',
  state?: string,
  city?: string
): Promise<NewsDataResponse> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    throw new Error('NEWSDATA_API_KEY is not set in environment variables.');
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    language: 'en',
    country: country.toLowerCase(),
  });

  // Build a query string for location if state/city are provided
  const locationQuery = [
    city && city.toLowerCase() !== 'all' ? city : '',
    state && state.toLowerCase() !== 'all' ? state : ''
  ].filter(Boolean).join(' ');

  // newsdata.io free plan does not allow `category` and `q` together with country.
  // We must choose one or the other.
  if (locationQuery) {
    // If there is a location, we must use the `q` param.
    // The category is ignored in this case.
    params.set('q', locationQuery);
  } else if (category && category.toLowerCase() !== 'all') {
    // If no location, but a specific category, use the `category` param.
    params.set('category', category.toLowerCase());
  } else {
    // If no location and "All" categories, use a general query.
    params.set('q', 'top'); 
  }

  const url = `${API_BASE_URL}?${params.toString()}`;

  try {
    console.log(`Fetching news from: ${url.replace(apiKey, 'REDACTED')}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PrayasNewsApp/1.0)',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        let errorMessage = `API Error (${response.status})`;
        try {
            const errorJson = JSON.parse(errorText);
            // Access the message from the nested 'results' object if it exists
            errorMessage = (errorJson.results && errorJson.results.message) 
              ? `${errorMessage}: ${errorJson.results.message}` 
              : `${errorMessage}: ${errorText}`;
        } catch (parseError) {
            errorMessage = `${errorMessage}: ${errorText}`;
        }
        throw new Error(errorMessage);
    }

    const data: NewsDataResponse = await response.json();

    if (!data.results) {
      // In case of success but empty results, return an empty array to prevent crashes
      console.log(`Successfully fetched 0 articles or invalid response structure.`);
      return { ...data, results: [] };
    }
    
    console.log(`Successfully fetched ${data.results.length} articles`);
    return data;

  } catch (error) {
    console.error('fetchNews error:', error);
    // Re-throw the error to be handled by the calling flow
    if (error instanceof Error) {
        if (error.message.includes('422')) {
          throw new Error('Invalid request parameters. This might be due to an incorrect API key or invalid parameter combinations. Please check API documentation.');
        } else if (error.message.includes('401')) {
          throw new Error('Invalid API key. Please check your newsdata.io API key in the environment variables.');
        } else if (error.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please wait before making another request.');
        }
    }
    throw error;
  }
}
