# Workflow & Development Preferences

## Quality Gate (MANDATORY — every prompt that changes code)

This is the standard workflow for every prompt, not a skill. Skills are single-responsibility tools called within this workflow.

```
IMPLEMENT → REVIEW LOOP → CI + TESTS → DONE
```

### Review loop

1. Spawn `/code-review` as a **subagent** (fresh eyes, no implementation context)
2. Subagent returns verdict: **PASS** or **FAIL**
3. If FAIL → fix all critical and warning issues → go to (1)
4. If PASS → proceed to CI + tests
5. Max 3 rounds. Suggestions do not block.

### Why a subagent?

- **Fresh perspective** — no context from implementation, catches things the author misses
- **No confirmation bias** — doesn't know the "why" behind shortcuts
- **Loop until clean** — issues are fixed and re-verified, not just acknowledged

### CI + tests

After review passes, run:
```bash
npm run type-check
npm run lint
npm test -- --run
```
ALL must pass. If any fails → fix → re-run from review loop.

### Rules

- This workflow applies to every prompt that produces code changes — no exceptions
- Skills stay single-responsibility: `/code-review` reviews, `/build` builds, `/test` tests, `/commit-code` commits
- Commits happen only when the user explicitly asks (via `/commit-code`)
- Never skip the review loop or proceed with known critical/warning issues

## Testing Strategy

### Test Tiers

| Tier | Scope | External I/O | When to run |
|------|-------|-------------|-------------|
| Unit | Pure functions (filter, formatter) | None | Every commit |
| Integration | Modules with HTTP (sources, telegram) | Mocked via `vitest.mock` | Every commit |
| E2E | Full pipeline via `main()` | All HTTP mocked | Every commit |

### Why no real-API tests?

- HN API and RSS feeds are external, flaky, and rate-limited
- Telegram sends real messages — no sandbox available
- This is a cron job, not a server — there's no running process to test against
- Mocked boundaries give deterministic, fast tests

### Test Structure

```
tests/
├── unit/
│   ├── filter.test.ts           # isRelevant, categorize, deduplicate, rankAndSlice
│   └── formatter.test.ts        # buildMessage, escapeHtml
├── integration/
│   ├── hackernews.test.ts       # fetchHackerNews with mocked HN API
│   ├── rss.test.ts              # fetchRSSFeeds with mocked RSS responses
│   └── telegram.test.ts         # sendTelegram with mocked Telegram API
└── e2e/
    └── pipeline.test.ts         # Full main() with all HTTP mocked
```

### Coverage Targets

| Module | Target | Rationale |
|--------|--------|-----------|
| filter.ts | 90%+ | Core business logic, pure functions, easy to test |
| formatter.ts | 90%+ | Output-critical, edge cases around char limit |
| sources/* | 70%+ | I/O boundary — test happy path + error handling |
| telegram.ts | 70%+ | I/O boundary — test send, error, and char limit |
| index.ts | 60%+ | Orchestrator — one E2E test covers it |
| config.ts | Skip | Constants and env reads — low value |

### Mocking Approach

- Use `vi.mock` for module-level mocks (e.g., mock `fetch` globally)
- Use `vi.fn()` for individual function spies
- Use `vi.useFakeTimers()` for date-dependent tests (LOOKBACK_HOURS filtering)
- Never mock filter.ts or formatter.ts — test them as-is (pure functions)
