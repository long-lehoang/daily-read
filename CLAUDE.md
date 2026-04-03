# CLAUDE.md — Daily Read

## Project overview

A Telegram bot that sends a daily curated digest of trending software engineering articles. Runs on GitHub Actions (cron schedule), fetches from Hacker News + RSS feeds, filters by relevance, and delivers a formatted message via Telegram Bot API.

This is a **cron job script**, not a server. It runs once, sends a message, and exits.

## Tech stack

- **Runtime:** Node.js 20
- **Language:** TypeScript (strict mode)
- **Dependencies:** rss-parser
- **Testing:** Vitest
- **Linting:** ESLint + Prettier
- **CI/CD:** GitHub Actions (cron: 8 AM UTC daily + manual dispatch)
- **Delivery:** Telegram Bot API (HTTP POST)

## Development workflow (MANDATORY for every prompt that changes code)

```
1. IMPLEMENT
   Build the feature / fix the bug.

2. CODE REVIEW (subagent loop)
   a. Spawn a code-review Agent (subagent) to review changes with fresh eyes
   b. If verdict is FAIL → fix all critical and warning issues → go to (a)
   c. If verdict is PASS → proceed
   Max 3 rounds. Suggestions (nice-to-have) do not block.

3. CI + TESTS
   npm run type-check        # must pass
   npm run lint              # must pass (auto-fix with npm run lint:fix if needed)
   npm test -- --run         # must pass
   ALL green → done. ANY red → fix and re-run from step 2.

4. COMMIT (only when user asks)
   Use /commit-code for conventional commits. Do not commit automatically.
```

This workflow applies to **every prompt** that produces code changes — features, bug fixes, refactors, test additions. Steps 2-3 are not optional.

## Project structure

```
daily-read/
├── .github/
│   └── workflows/
│       └── daily-digest.yml    # Cron schedule + manual trigger
├── src/
│   ├── index.ts                # Entry point — orchestrates everything
│   ├── config.ts               # Constants: feeds, keywords, category map, env vars
│   ├── sources/
│   │   ├── hackernews.ts       # Fetch & filter Hacker News top stories
│   │   └── rss.ts              # Fetch & filter RSS feeds
│   ├── filter.ts               # Keyword matching, deduplication, sorting
│   ├── formatter.ts            # Build the Telegram HTML message
│   └── telegram.ts             # Send message via Telegram Bot API
├── tests/
│   ├── filter.test.ts
│   ├── formatter.test.ts
│   └── sources/
│       ├── hackernews.test.ts
│       └── rss.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .gitignore
├── CLAUDE.md
├── PLAN.md
└── README.md
```

## Architecture

Simple pipeline — no server, no framework, no database:

```
[GitHub Actions Cron] → [src/index.ts] orchestrates:
  1. [sources/] fetches from HN API + RSS feeds (parallel)
  2. [filter.ts] filters, deduplicates, ranks
  3. [formatter.ts] builds HTML message
  4. [telegram.ts] sends to Telegram
```

### Design decisions

- No framework — just a `main()` function
- No database — stateless, each run fetches fresh data
- Graceful degradation — each feed is independently try/caught
- Telegram 4096 char limit handled with truncation + "... and N more"

## Coding conventions

### TypeScript

- Strict mode enabled (`"strict": true`)
- Never use `any` — use `unknown` and narrow types
- Interface for object shapes, Type for unions
- Explicit return types on exported functions
- Prefer `const` over `let`, never use `var`

### Naming

- Files: kebab-case (`hackernews.ts`)
- Functions: camelCase (`fetchHackerNews`)
- Types/Interfaces: PascalCase (`Article`)
- Constants: UPPER_SNAKE_CASE (`MAX_ARTICLES`)

### Error handling

- All async operations wrapped in try/catch
- Individual feed failures logged as warnings, not thrown
- `main()` catches at top level and exits with code 1
- Use `console.error()` for errors, `console.warn()` for degraded operation, `console.log()` for info

## Environment variables

| Variable             | Description                   | Required |
|----------------------|-------------------------------|----------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather     | Yes      |
| `TELEGRAM_CHAT_ID`   | Target chat/group ID          | Yes      |

Read from `process.env` in `src/config.ts`, validated at startup.

## Commands

```bash
npm install               # Install dependencies
npm run build             # TypeScript compilation (tsc)
npm run dev               # Run with tsx (no build needed)
npm run start             # Run compiled output (node dist/index.js)
npm run type-check        # TypeScript strict check (tsc --noEmit)
npm run lint              # ESLint
npm run lint:fix          # ESLint with auto-fix
npm test                  # Vitest unit tests
npm run test:watch        # Vitest watch mode
npm run test:coverage     # Vitest with coverage
```
