import { Article } from "./config";

const TELEGRAM_MAX_LENGTH = 4096;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildMessage(articles: Article[]): string {
  if (articles.length === 0) {
    return "🗞 <b>Tech Digest</b>\n\nNo relevant articles found today. Check back tomorrow!";
  }

  const grouped = groupByCategory(articles);
  const sources = new Set(articles.map((a) => a.source.replace(/\s*\(.*\)/, "")));

  const header = `🗞 <b>Tech Digest — ${formatDate()}</b>\n━━━━━━━━━━━━━━━━━━━━`;
  const articleWord = articles.length === 1 ? "article" : "articles";
  const sourceWord = sources.size === 1 ? "source" : "sources";
  const footer = `\n━━━━━━━━━━━━━━━━━━━━\n📊 ${articles.length} ${articleWord} from ${sources.size} ${sourceWord}`;

  const sections: string[] = [];
  for (const [category, items] of grouped) {
    const lines = items.map(
      (a) =>
        `• <a href="${escapeHtml(a.link)}">${escapeHtml(a.title)}</a> — <i>${escapeHtml(a.source)}</i>`
    );
    sections.push(`\n<b>${category}</b>\n${lines.join("\n")}`);
  }

  const fullMessage = header + sections.join("\n") + footer;

  if (fullMessage.length <= TELEGRAM_MAX_LENGTH) {
    return fullMessage;
  }

  return truncateMessage(header, footer, grouped, articles.length);
}

function groupByCategory(articles: Article[]): Map<string, Article[]> {
  const grouped = new Map<string, Article[]>();
  for (const article of articles) {
    const existing = grouped.get(article.category) ?? [];
    existing.push(article);
    grouped.set(article.category, existing);
  }
  return grouped;
}

function truncateMessage(
  header: string,
  footer: string,
  grouped: Map<string, Article[]>,
  totalArticles: number
): string {
  let totalIncluded = 0;
  const sections: string[] = [];
  const maxContentLength = TELEGRAM_MAX_LENGTH - header.length - footer.length - 25;
  let contentLength = 0;

  for (const [category, items] of grouped) {
    const categoryHeader = `\n<b>${category}</b>\n`;
    if (contentLength + categoryHeader.length >= maxContentLength) break;

    const lines: string[] = [];
    for (const a of items) {
      const line = `• <a href="${escapeHtml(a.link)}">${escapeHtml(a.title)}</a> — <i>${escapeHtml(a.source)}</i>`;
      if (contentLength + categoryHeader.length + line.length + 1 >= maxContentLength) break;
      lines.push(line);
      contentLength += line.length + 1;
      totalIncluded++;
    }

    if (lines.length > 0) {
      sections.push(`${categoryHeader}${lines.join("\n")}`);
      contentLength += categoryHeader.length;
    }
  }

  const remaining = totalArticles - totalIncluded;
  const moreText = remaining > 0 ? `\n\n... and ${remaining} more` : "";

  return header + sections.join("\n") + moreText + footer;
}
