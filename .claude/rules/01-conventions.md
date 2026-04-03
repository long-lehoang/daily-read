# Code Conventions & Patterns

## Config & Environment Variables

- Never read env vars at module top-level (e.g., `export const TOKEN = process.env.X`). This causes side effects at import time that break test mocking.
- Use lazy getter functions instead: `export function getToken(): string { ... }`
- Don't cache the result in module-level variables — read `process.env` on each call so tests can set different values between runs.
- For local dev, use Node's `--env-file=.env` flag (Node 20+) instead of the `dotenv` package. Set it in the `dev` script: `"dev": "tsx --env-file=.env src/index.ts"`. GitHub Actions uses `env:` in the workflow YAML instead.

## Vitest Mocking

- When a `vi.mock()` factory references a variable declared in the test file, use `vi.hoisted()` to ensure the variable is available at mock-hoist time:
  ```ts
  const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
  vi.mock("module", () => ({ default: class { method = mockFn; } }));
  ```
- Use `import type { X }` (not `import { X }`) when importing only types from modules with side effects — this avoids triggering the module's runtime code.

## Test Assertions

- When testing keyword/filter matching, ensure the test title contains ONLY the keyword being tested — not other keywords that could also match. A test that passes for the wrong reason is worse than no test.
  - Bad: `isRelevant("Learning Go for backend development")` — matches "backend", not "go"
  - Good: `isRelevant("Learning Go is fun")` — only matches "go"

## Keyword Matching

- Short keywords (<=3 chars) must use word-boundary regex (`\bkeyword\b`) to avoid false positives on substrings (e.g., "go" in "government", "rag" in "storage").
- Detect short keywords automatically by length rather than maintaining a manual set — prevents the set from drifting out of sync with the keyword list.
