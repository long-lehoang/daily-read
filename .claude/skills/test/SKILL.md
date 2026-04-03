---
name: test
description: Run Vitest tests and report results. Supports running all tests, specific files, or coverage mode.
model: haiku
allowed-tools: Bash(npm:*), Bash(npx:*), Read, Glob
---

# Test

Run project tests and report results.

If `$ARGUMENTS` is provided, use it to scope the test run. Otherwise, run all tests.

## Step 1: Run tests

Based on `$ARGUMENTS`:
- No arguments → `npm test -- --run` (all tests, single run)
- `coverage` → `npm run test:coverage`
- `watch` → `npm run test:watch`
- Specific file/pattern → `npx vitest run $ARGUMENTS`

## Step 2: Report results

```
## Test Results

### Unit Tests
- Total: X | Passed: Y | Failed: Z | Skipped: W

### Failed Tests (if any)
- [file] TestName — error message and relevant output

### Coverage (if run)
- filter: XX%
- formatter: XX%
- sources/hackernews: XX%
- sources/rss: XX%
- telegram: XX%
- config: XX%
- Overall: XX%

### Recommendations
- Uncovered areas that should have tests
- Edge cases not yet covered
```

Target coverage: 80%+ for filter and formatter (core logic).
