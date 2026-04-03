---
name: code-review
description: Review code changes for correctness, security, TypeScript quality, and best practices. Can run standalone or as a subagent from the development workflow.
model: opus
allowed-tools: Bash(git:*), Bash(npm:*), Read, Grep, Glob, AskUserQuestion
---

# Code Review

## Review Mode Selection

**If called as a subagent** (from the development workflow): Use the mode specified in the prompt. Do not use `AskUserQuestion` for mode selection.

**If called standalone** (`/code-review`): Use `AskUserQuestion` to ask the user which mode. Mark the recommended option with "(Recommended)" based on the current git state:

| Mode | When to recommend | What it compares |
|------|-------------------|-----------------|
| **Local changes** | Uncommitted changes present | Working directory vs HEAD |
| **Branch vs main** | On a feature branch | Current branch vs `origin/main` |

## Step 1: Identify changes

Based on the selected mode, get the diff:
- Local: `git diff` and `git diff --cached`
- Branch: `git diff origin/main...HEAD` and `git log --oneline origin/main..HEAD`

Read each changed file fully to understand context.

## Step 2: Run CI tools

```bash
npm run type-check        # TypeScript strict compilation
npm run lint              # ESLint
npm test -- --run         # Vitest (single run)
```

If any check fails, report the exact error and suggest a fix.

## Step 3: Code quality review

For each changed file, evaluate against these criteria:

### Correctness (CRITICAL)
- Logic errors in filtering, deduplication, or ranking
- Missing error handling in async operations (fetch, API calls)
- Unhandled promise rejections
- Off-by-one errors in array slicing
- Missing null/undefined checks on external API responses

### Security (CRITICAL)
- Hardcoded credentials, API keys, tokens — must come from env vars
- Secrets in logs or error messages
- No `.env` files committed
- Telegram token exposed in error responses

### TypeScript Quality
- No `any` types — use `unknown` and narrow
- Strict mode compliance
- Explicit return types on exported functions
- Proper null handling (optional chaining, nullish coalescing)
- Interface for object shapes, Type for unions

### Error Handling
- All fetch/HTTP calls wrapped in try/catch
- Individual feed failures do not crash the pipeline
- Meaningful error messages with context
- `main()` catches at top level with `process.exit(1)`
- Telegram API errors include status code and response body

### Architecture & Design
- Single responsibility: each file does one thing
- `config.ts` is the single source of truth for configuration
- No circular dependencies between modules
- Pipeline flow: sources → filter → formatter → telegram
- No business logic in `index.ts` — it only orchestrates

### API & External Integration
- Hacker News API responses validated before use
- RSS feed parsing errors handled per-feed
- Telegram message respects 4096 char limit
- HTTP timeouts set for external requests

### Performance
- `Promise.all` / `Promise.allSettled` used for parallel fetches
- No synchronous blocking operations
- Array operations efficient (no nested loops where a Set/Map suffices)

### Testing
- New logic has corresponding tests
- Tests cover happy path and error paths
- Edge cases covered (empty input, no matches, duplicates, exceeds char limit)

## Step 4: Critical issue check

**If called standalone**: If **Critical** issues found, use `AskUserQuestion` to present them and ask if the user wants to fix.

**If called as subagent**: Do not use `AskUserQuestion`. Just include all issues in the report.

## Step 5: Report

```
## Verdict: PASS / FAIL

## CI Results
- type-check: PASS/FAIL
- lint: PASS/FAIL
- test: PASS/FAIL (X passed, Y failed)

## Issues Found

### Critical (must fix)
- [file:line] Description and suggested fix

### Warning (should fix)
- [file:line] Description and suggested fix

### Suggestion (nice to have)
- [file:line] Description

### Positive
- What was done well

## Summary
X files reviewed, Y issues found (Z critical, W warnings)
```

**Verdict rules:**
- **PASS** = All CI tools pass AND zero critical AND zero warning issues
- **FAIL** = Any CI failure OR any critical OR any warning issue

If all CI passes and no issues found, report a clean bill of health with verdict **PASS**.
