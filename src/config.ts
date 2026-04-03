export const MAX_ARTICLES = 15;
export const HN_MIN_SCORE = 100;
export const HN_TOP_STORIES_LIMIT = 50;
export const RSS_ITEMS_PER_FEED = 10;
export const LOOKBACK_HOURS = 48;
export const FETCH_TIMEOUT_MS = 10_000;

export const CATEGORY_MAP: Record<string, string[]> = {
  "🏗️ System Design": [
    "system design",
    "microservice",
    "distributed system",
    "scalability",
    "event-driven",
    "cqrs",
    "api gateway",
    "grpc",
    "service mesh",
    "caching",
    "database",
  ],
  "🌐 Web Dev": [
    "react",
    "next.js",
    "vue",
    "svelte",
    "typescript",
    "node.js",
    "deno",
    "bun",
    "wasm",
    "frontend",
    "backend",
    "graphql",
  ],
  "⚙️ DevOps & Cloud": [
    "kubernetes",
    "docker",
    "terraform",
    "aws",
    "gcp",
    "azure",
    "ci/cd",
    "devops",
    "sre",
    "observability",
    "serverless",
    "cloud native",
  ],
  "🤖 AI & ML": [
    "machine learning",
    "llm",
    "gpt",
    "claude",
    "ai",
    "deep learning",
    "transformer",
    "rag",
    "vector database",
    "data pipeline",
    "mlops",
  ],
  "🧪 Testing & QA": [
    "testing",
    "test automation",
    "unit test",
    "integration test",
    "end-to-end test",
    "e2e test",
    "playwright",
    "cypress",
    "selenium",
    "test-driven",
    "tdd",
    "bdd",
    "qa",
    "quality assurance",
    "load testing",
    "performance testing",
    "api testing",
    "regression test",
    "test coverage",
    "vitest",
    "jest",
  ],
  "💻 General SWE": [
    "software engineer",
    "programming",
    "open source",
    "security",
    "vulnerability",
    "performance",
    "rust",
    "go",
    "python",
  ],
};

// Derive KEYWORDS from CATEGORY_MAP to avoid duplication
export const KEYWORDS: string[] = Object.values(CATEGORY_MAP).flat();

// Keywords <= 3 chars need word-boundary matching to avoid false positives
// (e.g., "go" in "government", "rag" in "storage", "aws" in "laws")
const SHORT_KEYWORD_MAX_LENGTH = 3;

export function matchesKeyword(text: string, keyword: string): boolean {
  if (keyword.length <= SHORT_KEYWORD_MAX_LENGTH) {
    return new RegExp(`\\b${keyword}\\b`, "i").test(text);
  }
  return text.toLowerCase().includes(keyword);
}

export interface RSSFeedConfig {
  url: string;
  source: string;
}

export const RSS_FEEDS: RSSFeedConfig[] = [
  { url: "https://dev.to/feed", source: "DEV.to" },
  { url: "https://feed.infoq.com", source: "InfoQ" },
  {
    url: "https://newsletter.pragmaticengineer.com/feed",
    source: "Pragmatic Engineer",
  },
  { url: "https://martinfowler.com/feed.atom", source: "Martin Fowler" },
  {
    url: "https://medium.com/feed/netflix-techblog",
    source: "Netflix Tech Blog",
  },
  {
    url: "https://engineering.fb.com/feed/",
    source: "Meta Engineering",
  },
  {
    url: "https://github.blog/engineering.atom",
    source: "GitHub Engineering",
  },
  {
    url: "https://aws.amazon.com/blogs/architecture/feed/",
    source: "AWS Architecture",
  },
  {
    url: "https://cloudblog.withgoogle.com/rss/",
    source: "Google Cloud Blog",
  },
  {
    url: "https://www.thoughtworks.com/rss/insights.xml",
    source: "ThoughtWorks",
  },
  { url: "https://thenewstack.io/feed", source: "The New Stack" },
];

export interface Article {
  title: string;
  link: string;
  source: string;
  category: string;
  publishedAt: Date;
  score?: number;
}

// Lazy-loaded env vars — only evaluated when accessed, not at import time
export function getTelegramToken(): string {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) {
    throw new Error("Missing required environment variable: TELEGRAM_BOT_TOKEN");
  }
  return token;
}

export function getChatId(): string {
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!chatId) {
    throw new Error("Missing required environment variable: TELEGRAM_CHAT_ID");
  }
  return chatId;
}
