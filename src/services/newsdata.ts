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
 * @returns A promise that resolves to the API response.
 */
export async function fetchNews(
  category: string = 'top',
  country: string = 'in'
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

  // NewsData.io requires `q` OR `category`, but not both when `country` is specified.
  if (category && category.toLowerCase() !== 'all') {
    params.set('category', category.toLowerCase());
  } else {
    // Use a general query for the 'All' category.
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
      throw new Error('Invalid response structure: missing results array');
    }
    
    console.log(`Successfully fetched ${data.results.length} articles`);
    return data;

  } catch (error) {
    console.error('fetchNews error:', error);
    // Re-throw the error to be handled by the calling flow
    if (error instanceof Error) {
        if (error.message.includes('422')) {
          throw new Error('Invalid request parameters. This might be due to an incorrect API key or invalid parameter combinations.');
        } else if (error.message.includes('401')) {
          throw new Error('Invalid API key. Please check your newsdata.io API key.');
        } else if (error.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please wait before making another request.');
        }
    }
    throw error;
  }
}
