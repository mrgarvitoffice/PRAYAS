
export type Article = {
  id: string;
  title: string;
  titleHi: string;
  summary: string;
  summaryHi: string;
  importantPoints: string[];
  importantPointsHi: string[];
  contentUrl: string;
  source: { name: string; cred_score: number };
  publishedAt: string;
  country: 'World' | 'India' | string; // Allow for other countries
  state: string | null;
  city: string | null;
  category: string;
  media: { image: string };
  rank_score: number;
  rawContent: string; // Added to store the full text for on-demand processing
  audioDataUriEn?: string; // Optional: To cache the generated English audio
  audioDataUriHi?: string; // Optional: To cache the generated Hindi audio
};

export type LocationData = {
  [country: string]: {
    states: {
      [state: string]: string[];
    };
  };
};

export type Language = 'en' | 'hi';

export type NewsDataArticle = {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  pubDate: string;
  image_url: string | null;
  source_id: string;
  country: string[];
  category: string[];
  language: string;
  content: string | null;
};

export type NewsDataResponse = {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage: string | null;
};
