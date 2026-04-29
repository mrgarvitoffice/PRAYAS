import { Article } from '../types';

const STOP_WORDS = new Set([
  'the', 'and', 'with', 'for', 'that', 'this', 'from', 'they', 'have', 'news', 'update', 
  'more', 'about', 'your', 'will', 'what', 'when', 'where', 'who', 'how', 'which',
  'there', 'their', 'were', 'been', 'has', 'had', 'are', 'was'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));
}

/**
 * A Content-Based Filtering algorithm that analyzes the text of articles the user has rated
 * to build a personalized preference profile. It then scores all articles against this profile
 * to sort the news feed, placing the most highly recommended articles at the top.
 */
export function sortArticlesByPreference(articles: Article[], ratings: Record<string, number>): Article[] {
  const ratedArticleIds = Object.keys(ratings);
  
  // If the user hasn't rated anything yet, return the original order
  if (ratedArticleIds.length === 0) return articles;

  const userProfile = new Map<string, number>();
  const categoryScores = new Map<string, number>();

  // 1. Build the User Profile based on ratings
  articles.forEach(article => {
    const rating = ratings[article.id];
    if (rating) {
      // Weight: 5 stars = +2, 4 stars = +1, 3 stars = 0, 2 stars = -1, 1 star = -2
      const weight = rating - 3; 
      
      if (weight !== 0) {
        // Build category preference
        if (article.category) {
            categoryScores.set(article.category, (categoryScores.get(article.category) || 0) + weight * 2);
        }

        // Build keyword preference
        const words = tokenize((article.title || '') + ' ' + (article.summary || '') + ' ' + (article.rawContent || ''));
        words.forEach(word => {
          userProfile.set(word, (userProfile.get(word) || 0) + weight);
        });
      }
    }
  });

  // 2. Score all articles against the profile
  const scoredArticles = articles.map(article => {
    let score = 0;
    
    // Add score based on text matches
    const words = tokenize((article.title || '') + ' ' + (article.summary || '') + ' ' + (article.rawContent || ''));
    words.forEach(word => {
        if (userProfile.has(word)) {
            score += userProfile.get(word)!;
        }
    });

    // Add score based on category matches
    if (article.category && categoryScores.has(article.category)) {
        score += categoryScores.get(article.category)! * 5; // Categories are strong signals
    }

    // Slightly penalize articles the user has already rated so fresh news floats to the top
    if (ratings[article.id]) {
        score -= 50; 
    }

    return { article, score };
  });

  // 3. Sort by highest score descending
  scoredArticles.sort((a, b) => b.score - a.score);

  return scoredArticles.map(sa => sa.article);
}

/**
 * Generates a human-readable summary of the user's ML preferences based on their ratings.
 */
export function getUserProfileSummary(articles: Article[], ratings: Record<string, number>) {
  const categoryScores = new Map<string, number>();
  let totalRated = 0;

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

  const sortedCategories = Array.from(categoryScores.entries()).sort((a, b) => b[1] - a[1]);
  const liked = sortedCategories.filter(c => c[1] > 0).map(c => c[0]);
  const disliked = sortedCategories.filter(c => c[1] < 0).map(c => c[0]);

  return {
    totalRated,
    likedTopics: liked.length > 0 ? liked : ["Start rating 4-5 stars to build your profile!"],
    dislikedTopics: disliked.length > 0 ? disliked : ["Start rating 1-2 stars to filter out topics."],
  };
}
