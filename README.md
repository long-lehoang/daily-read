# Daily Read

A Telegram bot that sends a daily curated digest of trending software engineering articles. Runs for free on GitHub Actions.

## What it does

- Fetches top stories from **Hacker News** (score ≥ 100)
- Fetches recent articles from **11 RSS feeds** (DEV.to, InfoQ, Netflix Tech Blog, etc.)
- Filters by relevance using keyword matching (system design, web dev, DevOps, AI/ML)
- Deduplicates, categorizes, and ranks articles
- Sends a formatted HTML message to your Telegram chat

## Setup

### 1. Create a Telegram bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token

### 2. Get your chat ID

1. Send a message to your bot
2. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `"chat":{"id":...}` in the response

### 3. Configure GitHub secrets

Add these secrets in your repo settings (`Settings → Secrets → Actions`):

| Secret               | Value                        |
|----------------------|------------------------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather    |
| `TELEGRAM_CHAT_ID`   | Your chat or group ID        |

### 4. Deploy

Push to `main`. The bot runs automatically at **8 AM UTC daily**.

To test immediately: go to `Actions → Daily Tech Digest → Run workflow`.

## Local development

```bash
cp .env.example .env
# Fill in your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID

npm install
npm run dev    # Run once with tsx
```

## Customization

- **Schedule**: Edit the cron in `.github/workflows/daily-digest.yml`
- **RSS feeds**: Add/remove feeds in `src/config.ts` → `RSS_FEEDS`
- **Keywords**: Edit `KEYWORDS` and `CATEGORY_MAP` in `src/config.ts`
- **Score threshold**: Change `HN_MIN_SCORE` in `src/config.ts` (default: 100)
- **Article count**: Change `MAX_ARTICLES` in `src/config.ts` (default: 15)
- **Lookback window**: Change `LOOKBACK_HOURS` in `src/config.ts` (default: 48)

## Cost

GitHub Actions free tier: 2,000 min/month. This bot uses ~1 min/run = ~30 min/month.
