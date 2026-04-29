import { Article } from '../types';

const STOP_WORDS = new Set([
  'the', 'and', 'with', 'for', 'that', 'this', 'from', 'they', 'have', 'news', 'update', 
  'more', 'about', 'your', 'will', 'what', 'when', 'where', 'who', 'how', 'which',
  'there', 'their', 'were', 'been', 'has', 'had', 'are', 'was', 'said', 'says'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));
}

// Metadata stored per rated article for cross-session memory
export type RatedArticleMeta = {
  rating: number;
  category: string;
  keywords: string[];
};

/**
 * Saves a rating alongside the article's category/keywords to localStorage
 * so the ML model has persistent memory even after the article leaves the feed.
 */
export function saveRatingWithMeta(
  userId: string,
  articleId: string,
  rating: number,
  article: Article
) {
  // Save raw rating
  const ratingsKey = `news_ratings_${userId}`;
  const stored = localStorage.getItem(ratingsKey);
  const ratings: Record<string, number> = stored ? JSON.parse(stored) : {};
  ratings[articleId] = rating;
  localStorage.setItem(ratingsKey, JSON.stringify(ratings));

  // Save article metadata for persistent ML profile
  const metaKey = `news_ratings_meta_${userId}`;
  const storedMeta = localStorage.getItem(metaKey);
  const meta: Record<string, RatedArticleMeta> = storedMeta ? JSON.parse(storedMeta) : {};
  meta[articleId] = {
    rating,
    category: article.category || 'general',
    keywords: tokenize(`${article.title} ${article.summary}`).slice(0, 20),
  };
  localStorage.setItem(metaKey, JSON.stringify(meta));
}

/**
 * Loads persistent article metadata from localStorage for the ML profile.
 */
export function loadRatingsMeta(userId: string): Record<string, RatedArticleMeta> {
  try {
    const stored = localStorage.getItem(`news_ratings_meta_${userId}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * A Content-Based Filtering algorithm that uses BOTH the current feed AND
 * persistent localStorage metadata to build a personalized preference profile.
 * This gives the model permanent memory across sessions.
 */
export function sortArticlesByPreference(
  articles: Article[],
  ratings: Record<string, number>,
  persistentMeta?: Record<string, RatedArticleMeta>,
  credibilityScores?: Record<string, { label: string; score: number }>
): Article[] {
  const ratedArticleIds = Object.keys(ratings);

  const userProfile = new Map<string, number>();
  const categoryScores = new Map<string, number>();

  // 1a. Build profile from current feed articles (in-session ratings)
  if (ratedArticleIds.length > 0) {
    articles.forEach(article => {
      const rating = ratings[article.id];
      if (rating) {
        const weight = rating - 3;
        if (weight !== 0) {
          if (article.category) {
            categoryScores.set(article.category, (categoryScores.get(article.category) || 0) + weight * 2);
          }
          const words = tokenize(`${article.title} ${article.summary} ${article.rawContent}`);
          words.forEach(word => {
            userProfile.set(word, (userProfile.get(word) || 0) + weight);
          });
        }
      }
    });
  }

  // 1b. PERSISTENT MEMORY: also build profile from stored article metadata
  if (persistentMeta) {
    Object.values(persistentMeta).forEach(meta => {
      const weight = meta.rating - 3;
      if (weight !== 0) {
        if (meta.category) {
          categoryScores.set(meta.category, (categoryScores.get(meta.category) || 0) + weight * 2);
        }
        meta.keywords.forEach(word => {
          userProfile.set(word, (userProfile.get(word) || 0) + weight);
        });
      }
    });
  }

  // 2. Score all articles against the profile + credibility
  const scoredArticles = articles.map(article => {
    let score = 0;

    // Keyword preference scoring
    const words = tokenize(`${article.title} ${article.summary} ${article.rawContent}`);
    words.forEach(word => {
      if (userProfile.has(word)) score += userProfile.get(word)!;
    });

    // Category preference scoring
    if (article.category && categoryScores.has(article.category)) {
      score += categoryScores.get(article.category)! * 5;
    }

    // 2c. CREDIBILITY BOOST/PENALTY — 97% Credible floats up, 61% Misleading pushed down
    if (credibilityScores?.[article.id]) {
      const credibility = credibilityScores[article.id];
      if (credibility.label === 'CREDIBLE') score += 30;       // Strong boost
      else if (credibility.label === 'UNVERIFIED') score += 0; // Neutral
      else if (credibility.label === 'MISLEADING') score -= 40; // Strong penalty
    }

    // Push already-rated articles down so fresh news floats up
    if (ratings[article.id]) score -= 50;

    return { article, score };
  });

  scoredArticles.sort((a, b) => b.score - a.score);
  return scoredArticles.map(sa => sa.article);
}

/**
 * Generates a human-readable summary of the user's ML preferences,
 * using BOTH current-session ratings AND persistent metadata.
 */
export function getUserProfileSummary(
  articles: Article[],
  ratings: Record<string, number>,
  persistentMeta?: Record<string, RatedArticleMeta>
) {
  const categoryScores = new Map<string, number>();
  let totalRated = 0;

  // From current feed
  articles.forEach(article => {
    const rating = ratings[article.id];
    if (rating) {
      totalRated++;
      const weight = rating - 3;
      if (weight !== 0 && article.category) {
        categoryScores.set(article.category, (categoryScores.get(article.category) || 0) + weight);
      }
    }
  });

  // From persistent memory
  if (persistentMeta) {
    Object.values(persistentMeta).forEach(meta => {
      if (!articles.find(a => ratings[a.id])) totalRated++;
      const weight = meta.rating - 3;
      if (weight !== 0 && meta.category) {
        categoryScores.set(meta.category, (categoryScores.get(meta.category) || 0) + weight);
      }
    });
    totalRated = Object.keys(persistentMeta).length;
  }

  const sortedCategories = Array.from(categoryScores.entries()).sort((a, b) => b[1] - a[1]);
  const liked = sortedCategories.filter(c => c[1] > 0).map(c => c[0]);
  const disliked = sortedCategories.filter(c => c[1] < 0).map(c => c[0]);

  return {
    totalRated,
    likedTopics: liked.length > 0 ? liked : ["Rate 4-5 ⭐ articles to build your profile!"],
    dislikedTopics: disliked.length > 0 ? disliked : ["Rate 1-2 ⭐ articles to filter out topics."],
  };
}
