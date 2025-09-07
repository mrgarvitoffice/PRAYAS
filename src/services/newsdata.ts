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
 * @param size The number of articles to fetch.
 * @returns A promise that resolves to the API response.
 */
export async function fetchNews(
  category: string = 'top',
  country: string = 'in',
  size: number = 11
): Promise<NewsDataResponse> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    throw new Error('NEWSDATA_API_KEY is not set in environment variables.');
  }

  const params: Record<string, string> = {
    apikey: apiKey,
    language: 'en',
    size: size.toString(),
  };

  if (country) {
    params.country = country.toLowerCase();
  }

  // Newsdata.io requires either `q` or `category` when `country` is specified.
  if (category && category.toLowerCase() !== 'all') {
    params.category = category.toLowerCase();
  } else {
    // Use a general query if no specific category is selected, as required by the API when a country is present.
    params.q = 'top'; 
  }

  const url = `${API_BASE_URL}?${new URLSearchParams(params).toString()}`;

  try {
    console.log(`Fetching news from: ${url.replace(apiKey, 'REDACTED')}`);
    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error Response:', errorBody);
        throw new Error(`API request failed with status ${response.status}`);
    }
    const data: NewsDataResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch news:', error);
    throw error;
  }
}
