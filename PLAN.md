# PLAN.md — Tech Digest Telegram Bot

## Overview
Build a Telegram bot that sends a daily curated digest of trending software engineering articles. It runs for free on GitHub Actions (cron schedule), fetches from Hacker News + RSS feeds, filters by relevance, and sends a formatted message to Telegram.

## Tech Stack
- Runtime: Node.js 20
- Language: TypeScript
- Dependencies: `rss-parser`
- CI/CD: GitHub Actions (cron)
- Delivery: Telegram Bot API

## Project Structure

```
tech-digest-bot/
├── .github/
│   └── workflows/
│       └── daily-digest.yml
├── src/
│   ├── index.ts          # Entry point — orchestrates everything
│   ├── config.ts         # Constants: feeds, keywords, category map, env vars
│   ├── sources/
│   │   ├── hackernews.ts # Fetch & filter Hacker News top stories
│   │   └── rss.ts        # Fetch & filter RSS feeds
│   ├── filter.ts         # Keyword matching, deduplication, sorting
│   ├── formatter.ts      # Build the Telegram HTML message
│   └── telegram.ts       # Send message via Telegram Bot API
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## Implementation Steps

### Step 1: Project scaffolding
- Initialize project: `npm init -y`
- Install deps: `npm i rss-parser` and `npm i -D typescript @types/node tsx`
- Create `tsconfig.json` targeting ES2022, CommonJS, outDir `dist`, rootDir `src`, strict mode
- Create `.gitignore` with `node_modules`, `dist`, `.env`
- Create `.env.example` with `TELEGRAM_BOT_TOKEN=` and `TELEGRAM_CHAT_ID=`
- Add scripts to package.json: `"build": "tsc"`, `"start": "node dist/index.js"`, `"dev": "tsx src/index.ts"`

### Step 2: Create `src/config.ts`
- Export `TELEGRAM_TOKEN` and `CHAT_ID` read from `process.env` (throw if missing)
- Export `MAX_ARTICLES = 15`
- Export `HN_MIN_SCORE = 100`
- Export `LOOKBACK_HOURS = 48`
- Export `KEYWORDS` array — flat list of lowercase keyword strings covering:
  - System design: system design, microservice, distributed system, scalability, event-driven, cqrs, api gateway, grpc, service mesh, caching, database
  - Web dev: react, next.js, vue, svelte, typescript, node.js, deno, bun, wasm, frontend, backend, graphql
  - DevOps: kubernetes, docker, terraform, aws, gcp, azure, ci/cd, devops, sre, observability, serverless, cloud native
  - AI/ML: machine learning, llm, gpt, claude, ai, deep learning, transformer, rag, vector database, data pipeline, mlops
  - General: software engineer, programming, open source, security, vulnerability, performance, rust, go, python
- Export `CATEGORY_MAP` — Record<string, string[]> mapping emoji-labeled category names to their keywords
- Export `RSS_FEEDS` array of `{ url: string; source: string }` objects:
  - DEV.to, InfoQ, Pragmatic Engineer, Martin Fowler, Netflix Tech Blog, Meta Engineering, GitHub Engineering, AWS Architecture Blog, Google Cloud Blog, ThoughtWorks, The New Stack
- Export shared `Article` interface: `{ title: string; link: string; source: string; category: string; publishedAt: Date; score?: number }`

### Step 3: Create `src/filter.ts`
- `isRelevant(title: string): boolean` — returns true if lowercased title includes any keyword from `KEYWORDS`
- `categorize(title: string): string` — iterate `CATEGORY_MAP`, return first matching category or fallback "💻 General SWE"
- `deduplicate(articles: Article[]): Article[]` — normalize title to alphanumeric lowercase, skip duplicates using a Set
- `rankAndSlice(articles: Article[]): Article[]` — sort by score desc then publishedAt desc, slice to `MAX_ARTICLES`

### Step 4: Create `src/sources/hackernews.ts`
- Export `fetchHackerNews(): Promise<Article[]>`
- Fetch `https://hacker-news.firebaseio.com/v0/topstories.json`
- Take first 50 IDs, fetch each item in parallel via `Promise.all`
- Filter: must have `url`, `score >= HN_MIN_SCORE`, and `isRelevant(title)`
- Map to `Article` with source `"HN (🔥${score})"`
- Wrap in try/catch, return empty array on failure

### Step 5: Create `src/sources/rss.ts`
- Export `fetchRSSFeeds(): Promise<Article[]>`
- Use `rss-parser` to parse each feed from `RSS_FEEDS`
- For each feed, take first 10 items
- Filter: `pubDate` must be within `LOOKBACK_HOURS`, and `isRelevant(title)`
- Map to `Article`
- Wrap each feed fetch in try/catch so one failure doesn't break everything
- Log warnings for failed feeds

### Step 6: Create `src/formatter.ts`
- Export `buildMessage(articles: Article[]): string`
- Build HTML string for Telegram (parse_mode: HTML)
- Header: `🗞 <b>Tech Digest — ${formatted date}</b>` with separator line
- Group articles by `category`
- For each category: bold header, then each article as `• <a href="...">title</a>` with source in italics
- Footer: article count and source count
- Export helper `escapeHtml(text: string): string` to escape `&`, `<`, `>`

### Step 7: Create `src/telegram.ts`
- Export `sendTelegram(text: string): Promise<void>`
- POST to `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
- Body: `{ chat_id, text, parse_mode: "HTML", disable_web_page_preview: true }`
- Throw on non-OK response with status and error body
- Handle Telegram's 4096 char limit: if message exceeds it, truncate articles and add "... and N more"

### Step 8: Create `src/index.ts`
- Import all modules
- `async function main()`:
  1. Log start
  2. `Promise.all([fetchHackerNews(), fetchRSSFeeds()])`
  3. Combine, deduplicate, rankAndSlice
  4. If empty, send "no articles found" message and return
  5. `buildMessage(articles)` → `sendTelegram(message)`
  6. Log done with count
- Call `main().catch(...)` with `process.exit(1)` on failure

### Step 9: Create `.github/workflows/daily-digest.yml`
- Trigger: `schedule` with cron `"0 8 * * *"` (8 AM UTC) + `workflow_dispatch` for manual runs
- Job `send-digest` on `ubuntu-latest`:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with node 20 and npm cache
  3. `npm ci`
  4. `npm run build`
  5. `node dist/index.js` with env vars from secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`

### Step 10: Create `README.md`
- Brief description of what the bot does
- Setup instructions:
  1. Create bot via @BotFather, get token
  2. Get chat ID via getUpdates endpoint
  3. Clone repo, `npm install`
  4. Add GitHub secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  5. Push and trigger manually to test
- Customization section: how to change schedule, add feeds, adjust keywords/score threshold

## Testing Checklist
- [ ] `npm run build` compiles without errors
- [ ] `TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy npm run dev` sends a message to Telegram
- [ ] Message is properly formatted with categories and clickable links
- [ ] Failed RSS feeds don't crash the process
- [ ] Empty results send a fallback message
- [ ] GitHub Actions workflow triggers on manual dispatch

## Environment Variables
| Variable             | Description                        | Required |
|----------------------|------------------------------------|----------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather          | Yes      |
| `TELEGRAM_CHAT_ID`   | Target chat/group ID               | Yes      |

## Notes
- GitHub Actions free tier: 2,000 min/month. This bot uses ~1 min/run = ~30 min/month.
- Hacker News API has no auth required and no rate limit for reasonable usage.
- RSS feeds may occasionally fail or change URLs — the bot gracefully skips them.
- Telegram messages have a 4096 character limit — handle truncation in the formatter.