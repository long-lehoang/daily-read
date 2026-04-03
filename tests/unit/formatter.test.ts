import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { escapeHtml, buildMessage } from "../../src/formatter";
import type { Article } from "../../src/config";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    title: "Test Article",
    link: "https://example.com",
    source: "Test Source",
    category: "💻 General SWE",
    publishedAt: new Date("2026-04-01T00:00:00Z"),
    ...overrides,
  };
}

describe("escapeHtml", () => {
  it("escapes &", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  it("escapes <", () => {
    expect(escapeHtml("a < b")).toBe("a &lt; b");
  });

  it("escapes >", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("handles strings with multiple special characters", () => {
    expect(escapeHtml("<script>alert('XSS')&</script>")).toBe(
      "&lt;script&gt;alert('XSS')&amp;&lt;/script&gt;"
    );
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("leaves clean strings unchanged", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
});

describe("buildMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns fallback message for empty articles", () => {
    const msg = buildMessage([]);
    expect(msg).toContain("No relevant articles found today");
  });

  it("includes date header", () => {
    const msg = buildMessage([makeArticle()]);
    expect(msg).toContain("Tech Digest");
    expect(msg).toContain("2026");
  });

  it("groups articles by category", () => {
    const articles = [
      makeArticle({ title: "React Tips", category: "🌐 Web Dev" }),
      makeArticle({ title: "K8s Guide", category: "⚙️ DevOps & Cloud" }),
      makeArticle({ title: "Vue Deep Dive", category: "🌐 Web Dev" }),
    ];
    const msg = buildMessage(articles);
    expect(msg).toContain("<b>🌐 Web Dev</b>");
    expect(msg).toContain("<b>⚙️ DevOps & Cloud</b>");
  });

  it("renders articles as HTML links with source", () => {
    const msg = buildMessage([
      makeArticle({ title: "My Article", link: "https://example.com", source: "HN (🔥200)" }),
    ]);
    expect(msg).toContain('<a href="https://example.com">My Article</a>');
    expect(msg).toContain("<i>HN (🔥200)</i>");
  });

  it("escapes HTML in article titles", () => {
    const msg = buildMessage([makeArticle({ title: "A <b>bold</b> & risky title" })]);
    expect(msg).toContain("A &lt;b&gt;bold&lt;/b&gt; &amp; risky title");
  });

  it("includes footer with article and source count", () => {
    const articles = [
      makeArticle({ source: "HN (🔥200)" }),
      makeArticle({ title: "Other", source: "DEV.to" }),
    ];
    const msg = buildMessage(articles);
    expect(msg).toContain("2 articles");
    expect(msg).toContain("2 sources");
  });

  it("uses singular for 1 article", () => {
    const msg = buildMessage([makeArticle()]);
    expect(msg).toContain("1 article from");
  });

  it("handles articles all in same category", () => {
    const articles = [
      makeArticle({ title: "A", category: "🌐 Web Dev" }),
      makeArticle({ title: "B", category: "🌐 Web Dev" }),
    ];
    const msg = buildMessage(articles);
    const matches = msg.match(/<b>🌐 Web Dev<\/b>/g);
    expect(matches).toHaveLength(1);
  });

  it("message stays under 4096 chars for MAX_ARTICLES articles", () => {
    const articles = Array.from({ length: 15 }, (_, i) =>
      makeArticle({ title: `Article Number ${i}`, link: `https://example.com/${i}` })
    );
    const msg = buildMessage(articles);
    expect(msg.length).toBeLessThanOrEqual(4096);
  });

  it("truncates when message exceeds 4096 chars", () => {
    const articles = Array.from({ length: 15 }, (_, i) =>
      makeArticle({
        title: `A very long article title that takes up lots of space in the message ${i} - extra padding to make it longer and longer`,
        link: `https://example.com/very/long/url/path/that/takes/up/space/${i}`,
        source: `Very Long Source Name ${i}`,
        category: `Category ${i % 3}`,
      })
    );
    const msg = buildMessage(articles);
    expect(msg.length).toBeLessThanOrEqual(4096);
  });
});
