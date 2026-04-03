import { Article, CATEGORY_MAP, KEYWORDS, matchesKeyword, MAX_ARTICLES } from "./config";

export function isRelevant(title: string): boolean {
  return KEYWORDS.some((keyword) => matchesKeyword(title, keyword));
}

export function categorize(title: string): string {
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((keyword) => matchesKeyword(title, keyword))) {
      return category;
    }
  }
  return "💻 General SWE";
}

export function deduplicate(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const normalized = article.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

export function rankAndSlice(articles: Article[]): Article[] {
  const sorted = [...articles].sort((a, b) => {
    const scoreA = a.score ?? -1;
    const scoreB = b.score ?? -1;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });
  return sorted.slice(0, MAX_ARTICLES);
}
