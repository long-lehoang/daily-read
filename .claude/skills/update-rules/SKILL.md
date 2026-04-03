---
name: update-rules
description: Capture lessons learned from the current session and persist them into .claude/rules/ files. Use at the end of a session or when the user gives feedback about patterns, conventions, or workflow preferences.
allowed-tools: Read, Edit, Write, Glob, Grep, AskUserQuestion
---

## Update Rules from Session Lessons

Capture learnings, corrections, and preferences from the current conversation and persist them into `.claude/rules/` so they apply to all future sessions.

### Step 1: Identify lessons

Review the current conversation for:
- Corrections the user made to your approach
- Patterns or conventions the user pointed out
- Workflow preferences expressed during the session
- Mistakes you made that a rule could prevent
- Approaches that worked well and should be repeated

If `$ARGUMENTS` is provided, use it as the lesson to save. Otherwise, scan the full conversation.

If no meaningful lessons found, inform the user and stop.

### Step 2: Classify

Determine which rule file each lesson belongs to:

| File | Content |
|------|---------|
| `01-conventions.md` | Code patterns, TypeScript idioms, naming, architecture, error handling |
| `02-workflow.md` | Development workflow, CI/CD, commit practices |
| `03-testing.md` | Test specifications, coverage targets, mocking approach |
| **New file** | If it doesn't fit existing categories, propose a new `XX-topic.md` |

### Step 3: Read existing rules

Read the target rule file to:
- Understand current content and structure
- Find the right section to add to
- Check for duplicates or conflicts

### Step 4: Draft the update

Write the rule following these guidelines:
- **Concise and actionable** — not vague platitudes
- **Include "why"** — when the reason isn't obvious
- **Use consistent format** — bullet points for rules, code blocks for examples
- **Keep rules general** — should apply broadly, not to a single task

Example format:
```markdown
## Error Handling in RSS Sources

- Use `Promise.allSettled` instead of `Promise.all` when fetching multiple feeds — one failure should not abort the entire batch
- Set a 10-second timeout on all external HTTP requests to prevent hanging
- Log failed feeds with `console.warn` including the feed URL and error message
```

### Step 5: Present for approval

Use `AskUserQuestion` to show the proposed change:
- Show the exact text to be added/modified
- Show which file and section it targets
- Options: **Approve** / **Edit** / **Skip**

### Step 6: Apply

Edit the rule file with the approved content.
Run `cat` on the file to confirm the update was applied correctly.

### Guidelines

- **Don't duplicate** — Check if a similar rule already exists before adding
- **Don't contradict** — If the new rule conflicts with an existing one, flag it and ask which takes precedence
- **Merge when possible** — If an existing rule covers a related topic, extend it rather than creating a new entry
- **Keep it lean** — Remove rules that are no longer relevant. Fewer, better rules > many stale rules
