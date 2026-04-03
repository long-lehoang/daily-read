---
name: commit-code
description: Stage and commit code changes with a conventional commit message. Assumes code review and CI have already passed via the development workflow.
model: haiku
allowed-tools: Bash(git:*), Read, Glob, Grep, AskUserQuestion
---

# Commit Code

Stage and commit the current changes with a proper conventional commit message.

**Prerequisite:** The development workflow (code review loop + CI + tests) must have already passed before invoking this skill.

If `$ARGUMENTS` is provided, use it as guidance for the commit message. Otherwise, analyze the diff to generate an appropriate message.

## Step 1: Branch check

Run `git branch --show-current`. If on `main` or `master`: **STOP**, ask user to create a feature branch.

## Step 2: Understand the changes

Run in parallel:
```bash
git status                           # See all changed/untracked files
git diff                             # Unstaged changes
git diff --cached                    # Staged changes
git log --oneline -5                 # Recent commits for style reference
```

## Step 3: Smart staging

Adapt based on `git status`:
- Staged + unstaged → `AskUserQuestion`: **All changes** / **Staged only** / **Cancel**
- Only staged → proceed directly
- Only unstaged → `AskUserQuestion`: **Stage all** / **Cancel**
- Nothing → inform user, stop

Stage specific files relevant to the change (prefer explicit `git add <file>` over `git add .`).
Never stage files that likely contain secrets (`.env`, `.env.local`, credentials, keys).

## Step 4: Create the commit

### Message format

```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Types
| Type | When |
|------|------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `style` | Formatting, linting fixes (no logic change) |
| `docs` | Documentation changes |
| `chore` | Build process, deps, tooling, CI changes |
| `perf` | Performance improvement |

### Scope
Use the area of the codebase affected:
- `sources`, `filter`, `formatter`, `telegram`, `config` — module-level scope
- `ci` — for GitHub Actions workflow changes
- `deps` — for dependency changes
- Omit scope for changes spanning the whole project

### Rules
- Subject line: imperative mood, lowercase, no period, under 72 chars
- Body: explain **what** and **why**, not how
- Reference issue numbers if mentioned: `Fixes #123`

### Example
```
feat(sources): add dev.to rss feed to daily digest

Include DEV.to top articles in the feed sources list.
Filtered by same keyword relevance as other feeds.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

## Step 5: Approval

Output the full commit message and changed files summary as visible text, then use `AskUserQuestion`. Options: **Approve** / **Edit message** / **Cancel**. If "Edit", ask for revision and re-present.

## Step 6: Commit

Only after user approves. Always use HEREDOC for multi-line commit messages.

## Step 7: Verify and optional follow-up

After committing, run `git log -1` and `git status` to confirm success.

Ask user if they want to push to remote.

## Important
- NEVER amend existing commits unless explicitly asked
- NEVER force push
- NEVER skip hooks (no `--no-verify`)
- NEVER push to remote unless explicitly asked
- Always use HEREDOC for multi-line commit messages to preserve formatting
