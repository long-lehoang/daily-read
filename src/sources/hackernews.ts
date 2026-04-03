import { Article, FETCH_TIMEOUT_MS, HN_MIN_SCORE, HN_TOP_STORIES_LIMIT } from "../config";
import { categorize, isRelevant } from "../filter";

const HN_API = "https://hacker-news.firebaseio.com/v0";

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  time?: number;
}

export async function fetchHackerNews(): Promise<Article[]> {
  try {
    const res = await fetch(`${HN_API}/topstories.json`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`HN API returned ${res.status}`);
      return [];
    }

    const ids: unknown = await res.json();
    if (!Array.isArray(ids)) {
      console.error("HN API returned unexpected response format");
      return [];
    }

    const topIds = (ids as number[]).slice(0, HN_TOP_STORIES_LIMIT);

    const results = await Promise.allSettled(
      topIds.map(async (id) => {
        const itemRes = await fetch(`${HN_API}/item/${id}.json`, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!itemRes.ok) return null;
        return itemRes.json() as Promise<HNItem>;
      })
    );

    const articles: Article[] = [];
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const item = result.value;
      if (!item.title || !item.url) continue;
      if ((item.score ?? 0) < HN_MIN_SCORE) continue;
      if (!isRelevant(item.title)) continue;

      articles.push({
        title: item.title,
        link: item.url,
        source: `HN (🔥${item.score})`,
        category: categorize(item.title),
        publishedAt: new Date((item.time ?? 0) * 1000),
        score: item.score,
      });
    }

    return articles;
  } catch (error) {
    console.error("Failed to fetch Hacker News:", error);
    return [];
  }
}
