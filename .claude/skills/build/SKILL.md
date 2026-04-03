---
name: build
description: Build the TypeScript project and verify it compiles cleanly. Run type-check, lint, and compilation.
model: haiku
allowed-tools: Bash(npm:*), Bash(node:*), Read
---

# Build

Build the project and verify everything compiles cleanly.

## Step 1: Install dependencies (if needed)

Check if `node_modules/` exists:
```bash
ls node_modules/ 2>/dev/null || npm install
```

## Step 2: Type check

```bash
npm run type-check
```

If TypeScript errors found, report exact file, line, and error.

## Step 3: Lint check

```bash
npm run lint
```

If lint errors found, report them. If auto-fixable, suggest running `npm run lint:fix`.

## Step 4: Compile

```bash
npm run build
```

Verify `dist/` directory is created with compiled JavaScript files.

## Step 5: Report

```
## Build Results
- Dependencies: INSTALLED/CACHED
- type-check: PASS/FAIL
- lint: PASS/FAIL
- build (tsc): PASS/FAIL
- Output: dist/ (X files)

## Errors (if any)
- [file:line] Error description
```

If all pass, confirm the build is clean with a one-line summary.
