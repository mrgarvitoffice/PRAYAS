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
  country: 'World' | 'India';
  state: string | null;
  city: string | null;
  category: string;
  media: { image: string };
  rank_score: number;
};

export type LocationData = {
  [country: string]: {
    states: {
      [state: string]: string[];
    };
  };
};

export type Language = 'en' | 'hi';
