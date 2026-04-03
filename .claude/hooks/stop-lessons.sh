#!/bin/bash
# Stop hook: Enforce quality gate + capture lessons before ending.
#
# On FIRST stop: checks for unreviewed code changes, then reminds about lessons.
# On SECOND stop (stop_hook_active=true): allows exit to prevent infinite loop.
#
# Exit codes:
#   0 = allow Claude to stop
#   2 = block stop, stderr message is fed back to Claude

INPUT=$(cat)

# Prevent infinite loop
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

MESSAGES=""

# Check 1: Are there uncommitted code changes in src/ or tests/?
if git diff --name-only -- 'src/' 'tests/' 2>/dev/null | grep -q .; then
  MESSAGES="${MESSAGES}
## Quality Gate Reminder
You have uncommitted code changes in src/ or tests/. Per the development workflow:
1. Run code review via a subagent (spawn Agent with /code-review criteria)
2. Fix any critical/warning issues and re-review until PASS
3. Run CI: npm run type-check && npm run lint && npm test -- --run
4. Only then is the task complete.

If you have already completed the quality gate, disregard this reminder.
"
fi

# Check 2: Lessons learned
MESSAGES="${MESSAGES}
## Lessons Learned
Before ending this session, reflect briefly:
1. Were there any corrections, mistakes, or surprises?
2. Did the user express preferences about workflow or code patterns?
3. Were there approaches that worked particularly well?

If there are lessons worth saving, run /update-rules to persist them.
If nothing notable happened, you may stop.
"

echo "$MESSAGES" >&2
exit 2
