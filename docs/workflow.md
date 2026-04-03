# Daily Read — Bot Workflow

## Overview

A stateless cron job that runs once daily, fetches trending tech articles from multiple sources, filters and ranks them, then delivers a formatted digest to Telegram.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions (8 AM UTC)                        │
│                          or manual trigger                              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         1. FETCH (parallel)                             │
│                                                                         │
│   ┌─────────────────────┐         ┌──────────────────────────┐         │
│   │   Hacker News API   │         │     11 RSS Feeds         │         │
│   │                     │         │                          │         │
│   │  GET /topstories    │         │  DEV.to, InfoQ,          │         │
│   │  → top 50 IDs       │         │  Pragmatic Engineer,     │         │
│   │  → fetch each item  │         │  Martin Fowler,          │         │
│   │  (Promise.allSettled)│         │  Netflix Tech Blog,      │         │
│   │                     │         │  Meta Engineering,       │         │
│   │  Filters:           │         │  GitHub Engineering,     │         │
│   │  • score ≥ 100      │         │  AWS Architecture,       │         │
│   │  • has URL          │         │  Google Cloud Blog,      │         │
│   │  • isRelevant()     │         │  ThoughtWorks,           │         │
│   │                     │         │  The New Stack           │         │
│   │  10s timeout        │         │                          │         │
│   │  per request        │         │  Filters:                │         │
│   └─────────┬───────────┘         │  • published < 48h ago   │         │
│             │                     │  • has pubDate           │         │
│             │                     │  • first 10 per feed     │         │
│             │                     │  • isRelevant()          │         │
│             │                     │                          │         │
│             │                     │  10s timeout per feed    │         │
│             │                     │  (Promise.allSettled)    │         │
│             │                     └────────────┬─────────────┘         │
│             │                                  │                       │
│             │    ┌─────────────────────────┐    │                       │
│             └───►│  Combined Articles[]    │◄───┘                       │
│                  └────────────┬────────────┘                            │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       2. FILTER & RANK                                  │
│                                                                         │
│   isRelevant(title)                                                     │
│   ├── Matches against ~60 keywords                                      │
│   ├── Short keywords (≤3 chars: go, ai, rag, llm, gcp, aws, sre...)   │
│   │   use word-boundary regex (\b) to avoid false positives             │
│   └── Longer keywords use substring match                               │
│                                                                         │
│   categorize(title) → assigns to first matching category:               │
│   ├── 🏗️ System Design  (microservice, distributed system, grpc...)    │
│   ├── 🌐 Web Dev         (react, typescript, node.js, graphql...)      │
│   ├── ⚙️ DevOps & Cloud  (kubernetes, docker, terraform, aws...)       │
│   ├── 🤖 AI & ML         (machine learning, llm, transformer, rag...) │
│   └── 💻 General SWE     (programming, security, rust, python...)      │
│                                                                         │
│   deduplicate(articles)                                                 │
│   └── Normalizes titles (lowercase, strip non-alphanumeric)             │
│       and removes duplicates using a Set                                │
│                                                                         │
│   rankAndSlice(articles)                                                │
│   ├── Sort by score desc (HN score), then by date desc                  │
│   └── Take top 15 articles                                              │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        3. FORMAT                                        │
│                                                                         │
│   buildMessage(articles) → Telegram HTML                                │
│                                                                         │
│   ┌───────────────────────────────────────────────┐                     │
│   │ 🗞 <b>Tech Digest — Wednesday, April 2, 2026</b>│                  │
│   │ ━━━━━━━━━━━━━━━━━━━━                          │                     │
│   │                                               │                     │
│   │ <b>🤖 AI & ML</b>                              │                     │
│   │ • <a href="...">Article title</a> — <i>HN</i>│                     │
│   │ • <a href="...">Article title</a> — <i>DEV</i>│                    │
│   │                                               │                     │
│   │ <b>⚙️ DevOps & Cloud</b>                       │                     │
│   │ • <a href="...">Article title</a> — <i>RSS</i>│                    │
│   │                                               │                     │
│   │ ━━━━━━━━━━━━━━━━━━━━                          │                     │
│   │ 📊 15 articles from 8 sources                 │                     │
│   └───────────────────────────────────────────────┘                     │
│                                                                         │
│   • HTML-escapes titles and sources (& < > ")                           │
│   • Groups articles by category                                         │
│   • If message > 4096 chars → truncates + "... and N more"             │
│   • If 0 articles → "No relevant articles found today"                  │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         4. DELIVER                                      │
│                                                                         │
│   POST https://api.telegram.org/bot{TOKEN}/sendMessage                  │
│   {                                                                     │
│     chat_id: CHAT_ID,                                                   │
│     text: <formatted HTML>,                                             │
│     parse_mode: "HTML",                                                 │
│     disable_web_page_preview: true                                      │
│   }                                                                     │
│                                                                         │
│   • 10s timeout                                                         │
│   • Throws on non-OK response (with status + body)                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

## Error Handling

┌──────────────────────────────────────────────────────────────────┐
│                     Graceful Degradation                         │
│                                                                  │
│  HN fails?        → returns [], RSS still works                  │
│  RSS feed fails?  → skipped, other feeds still work              │
│  HN item fails?   → skipped (Promise.allSettled)                 │
│  Both fail?       → sends "No articles found" fallback           │
│  Telegram fails?  → throws, main() catches, exit(1)             │
│                                                                  │
│  No single source failure crashes the pipeline.                  │
│  Only a Telegram delivery failure is fatal.                      │
└──────────────────────────────────────────────────────────────────┘

## Data Flow

```
Article {
  title: string         ← from HN item.title or RSS item.title
  link: string          ← from HN item.url or RSS item.link
  source: string        ← "HN (🔥200)" or "DEV.to"
  category: string      ← assigned by categorize() from CATEGORY_MAP
  publishedAt: Date     ← from HN item.time or RSS item.pubDate
  score?: number        ← HN score only (RSS has no score)
}
```

## Trigger

| Trigger | When |
|---------|------|
| Cron schedule | `0 8 * * *` — 8 AM UTC daily |
| Manual | GitHub Actions → "Run workflow" button |

## Configuration Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_ARTICLES` | 15 | Max articles in the digest |
| `HN_MIN_SCORE` | 100 | Minimum HN score to include |
| `HN_TOP_STORIES_LIMIT` | 50 | How many top HN stories to check |
| `RSS_ITEMS_PER_FEED` | 10 | Max items to check per RSS feed |
| `LOOKBACK_HOURS` | 48 | Only include articles from last 48h |
| `FETCH_TIMEOUT_MS` | 10,000 | HTTP timeout for all requests |
