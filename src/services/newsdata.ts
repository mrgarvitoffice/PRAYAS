/**
 * @fileOverview A service for fetching news articles from the NewsData.io API.
 */
import type { NewsDataResponse } from '@/lib/types';

const API_BASE_URL = 'https://newsdata.io/api/1/news';

/**
 * Fetches news articles from the NewsData.io API.
 * @param query The search query for articles.
 * @returns A promise that resolves to the API response.
 */
export async function fetchNews(
  query: string = 'top'
): Promise<NewsDataResponse> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    throw new Error('NEWSDATA_API_KEY is not set in environment variables.');
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    q: query,
    language: 'en',
  });

  const url = `${API_BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data: NewsDataResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch news:', error);
    throw error;
  }
}
