import Parser from "rss-parser";
import { Article, FETCH_TIMEOUT_MS, LOOKBACK_HOURS, RSS_FEEDS, RSS_ITEMS_PER_FEED } from "../config";
import { categorize, isRelevant } from "../filter";

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    "User-Agent": "daily-read/1.0 (RSS reader bot)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

export async function fetchRSSFeeds(): Promise<Article[]> {
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const allArticles: Article[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items.slice(0, RSS_ITEMS_PER_FEED);
      const articles: Article[] = [];

      for (const item of items) {
        if (!item.title || !item.link) continue;
        if (!item.pubDate) continue;

        const pubDate = new Date(item.pubDate);
        if (pubDate < cutoff) continue;
        if (!isRelevant(item.title)) continue;

        articles.push({
          title: item.title,
          link: item.link,
          source: feed.source,
          category: categorize(item.title),
          publishedAt: pubDate,
        });
      }

      return articles;
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
    } else {
      console.warn("Failed to fetch RSS feed:", result.reason);
    }
  }

  return allArticles;
}
