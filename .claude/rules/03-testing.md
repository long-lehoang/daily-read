# Test Specifications

## Unit Tests

### `tests/unit/filter.test.ts`

#### `isRelevant(title)`
- Returns `true` for title containing a keyword ("Building a distributed system with gRPC")
- Returns `true` for case-insensitive match ("KUBERNETES deployment guide")
- Returns `false` for unrelated title ("Best chocolate cake recipe")
- Returns `false` for empty string
- Returns `true` when keyword appears as substring ("node.js" matches in "serverless node.js api")

#### `categorize(title)`
- Returns correct category for each CATEGORY_MAP group (system design, web dev, devops, AI/ML)
- Returns first matching category when title matches multiple categories
- Returns fallback "💻 General SWE" when no category matches but isRelevant is true

#### `deduplicate(articles)`
- Removes exact duplicate titles
- Removes near-duplicates that differ only in casing or punctuation ("How to use Docker" vs "how to use docker!")
- Preserves first occurrence, removes later duplicates
- Returns empty array for empty input
- Preserves order of remaining articles

#### `rankAndSlice(articles)`
- Sorts by score descending (highest first)
- Breaks score ties by publishedAt descending (newest first)
- Articles without score rank below scored articles
- Slices to MAX_ARTICLES limit
- Returns all articles if count < MAX_ARTICLES
- Returns empty array for empty input

---

### `tests/unit/formatter.test.ts`

#### `escapeHtml(text)`
- Escapes `&` → `&amp;`
- Escapes `<` → `&lt;`
- Escapes `>` → `&gt;`
- Handles strings with multiple special characters
- Returns empty string for empty input
- Leaves clean strings unchanged

#### `buildMessage(articles)`
- Includes date header with correct UTC date
- Groups articles by category with emoji headers
- Each article rendered as `• <a href="link">title</a> — <i>source</i>`
- HTML-escapes article titles containing `&`, `<`, `>`
- Includes footer with article count and source count
- Returns fallback message for empty articles array
- **Char limit**: message under 4096 chars for MAX_ARTICLES articles
- **Truncation**: when message exceeds 4096 chars, truncates articles and appends "... and N more"
- Handles single article correctly (no trailing separator)
- Handles articles all in same category (single group)
- Handles articles in many different categories (multiple groups)

---

## Integration Tests

### `tests/integration/hackernews.test.ts`

Mock: `global.fetch`

#### Happy path
- Fetches top story IDs, then individual items in parallel
- Filters out items with score < HN_MIN_SCORE
- Filters out items without a URL
- Filters out items that are not relevant (isRelevant = false)
- Maps to Article with source "HN (🔥{score})"
- Returns articles sorted by score

#### Error handling
- Returns empty array when top stories endpoint fails (network error)
- Returns empty array when top stories returns non-JSON
- Skips individual items that fail to fetch (Promise.allSettled)
- Skips items with missing/null fields (title, url)
- Handles empty top stories array

---

### `tests/integration/rss.test.ts`

Mock: `rss-parser` module

#### Happy path
- Parses each feed and returns articles
- Filters items older than LOOKBACK_HOURS
- Filters out items that are not relevant
- Maps to Article with correct source name
- Takes only first 10 items per feed

#### Error handling
- Skips feed that fails to parse (invalid XML)
- Skips feed that times out
- Logs warning for failed feeds (spy on console.warn)
- Returns articles from successful feeds even when some fail
- Returns empty array when all feeds fail
- Handles feed with zero items

---

### `tests/integration/telegram.test.ts`

Mock: `global.fetch`

#### Happy path
- Sends POST to correct Telegram API URL
- Includes correct body: chat_id, text, parse_mode "HTML", disable_web_page_preview
- Does not throw on 200 response

#### Error handling
- Throws on non-OK response with status code and body
- Throws on network error

#### Char limit
- Sends message as-is when under 4096 chars
- Truncates and appends "... and N more" when over 4096 chars

---

## E2E Test

### `tests/e2e/pipeline.test.ts`

Mock: `global.fetch` (all external HTTP)

#### Full pipeline
- Runs main() end-to-end with mocked HN + RSS + Telegram responses
- Verifies Telegram sendMessage was called with a valid HTML message
- Message contains articles from both HN and RSS sources
- Articles are deduplicated (inject duplicates in mock data)
- Articles are ranked (highest score first)
- Message respects 4096 char limit

#### Graceful degradation
- HN fails, RSS succeeds → message sent with RSS articles only
- RSS fails, HN succeeds → message sent with HN articles only
- Both fail → "no articles found" fallback message sent

#### Empty results
- HN and RSS return articles but none pass relevance filter → fallback message sent
