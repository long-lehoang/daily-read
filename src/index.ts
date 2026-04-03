import { fetchHackerNews } from "./sources/hackernews";
import { fetchRSSFeeds } from "./sources/rss";
import { deduplicate, rankAndSlice } from "./filter";
import { buildMessage } from "./formatter";
import { sendTelegram } from "./telegram";

async function main(): Promise<void> {
  console.log("🚀 Starting daily tech digest...");

  const [hnArticles, rssArticles] = await Promise.all([
    fetchHackerNews(),
    fetchRSSFeeds(),
  ]);

  console.log(
    `📥 Fetched ${hnArticles.length} from HN, ${rssArticles.length} from RSS`
  );

  const combined = [...hnArticles, ...rssArticles];
  const unique = deduplicate(combined);
  const articles = rankAndSlice(unique);

  if (articles.length === 0) {
    console.log("⚠️ No relevant articles found");
    await sendTelegram(buildMessage([]));
    return;
  }

  const message = buildMessage(articles);
  await sendTelegram(message);

  console.log(`✅ Sent digest with ${articles.length} articles`);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
