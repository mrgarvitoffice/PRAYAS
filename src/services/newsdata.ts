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

  const params = new URLSearchParams({
    apikey: apiKey,
    language: 'en',
    size: size.toString(),
  });

  // newsdata.io requires `q` or `category` but not both.
  if (category && category.toLowerCase() !== 'all') {
    params.set('category', category.toLowerCase());
  } else {
    // Use a general query if no specific category is selected
    params.set('q', 'top');
  }

  params.set('country', country.toLowerCase() || 'in');


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

    console.log('Response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        try {
            const errorJson = JSON.parse(errorText);
            // Accessing the results field which may contain the error message
            const errorMessage = (errorJson.results && errorJson.results.message) || errorJson.message || errorText;
            throw new Error(`API Error (${response.status}): ${errorMessage}`);
        } catch (parseError) {
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }
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
    throw error;
  }
}
