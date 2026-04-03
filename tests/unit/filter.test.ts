import { describe, it, expect } from "vitest";
import { isRelevant, categorize, deduplicate, rankAndSlice } from "../../src/filter";
import type { Article } from "../../src/config";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    title: "Test Article",
    link: "https://example.com",
    source: "Test",
    category: "💻 General SWE",
    publishedAt: new Date("2026-04-01T00:00:00Z"),
    ...overrides,
  };
}

describe("isRelevant", () => {
  it("returns true for title containing a keyword", () => {
    expect(isRelevant("Building a distributed system with gRPC")).toBe(true);
  });

  it("returns true for case-insensitive match", () => {
    expect(isRelevant("KUBERNETES deployment guide")).toBe(true);
  });

  it("returns false for unrelated title", () => {
    expect(isRelevant("Best chocolate cake recipe")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isRelevant("")).toBe(false);
  });

  it("returns true when keyword appears as substring", () => {
    expect(isRelevant("serverless node.js api")).toBe(true);
  });

  it("does not false-positive on 'go' as substring", () => {
    expect(isRelevant("Government policy update")).toBe(false);
  });

  it("matches 'go' as a standalone word", () => {
    expect(isRelevant("Learning Go is fun")).toBe(true);
  });

  it("does not false-positive on 'rag' as substring", () => {
    expect(isRelevant("Storage solutions for enterprise")).toBe(false);
  });

  it("matches 'rag' as a standalone word", () => {
    expect(isRelevant("Building a RAG pipeline")).toBe(true);
  });

  it("does not false-positive on 'ai' as substring", () => {
    expect(isRelevant("Explained: why cats purr")).toBe(false);
  });

  it("matches 'ai' as a standalone word", () => {
    expect(isRelevant("AI tools for developers")).toBe(true);
  });
});

describe("categorize", () => {
  it("returns System Design for system design keywords", () => {
    expect(categorize("Scaling microservice architecture")).toBe("🏗️ System Design");
  });

  it("returns Web Dev for web dev keywords", () => {
    expect(categorize("Getting started with React 19")).toBe("🌐 Web Dev");
  });

  it("returns DevOps for devops keywords", () => {
    expect(categorize("Kubernetes best practices")).toBe("⚙️ DevOps & Cloud");
  });

  it("returns AI & ML for AI keywords", () => {
    expect(categorize("Building RAG pipelines with LLM")).toBe("🤖 AI & ML");
  });

  it("returns first matching category when multiple match", () => {
    expect(categorize("database scaling with kubernetes")).toBe("🏗️ System Design");
  });

  it("returns fallback for unmatched title", () => {
    expect(categorize("completely unrelated topic xyz")).toBe("💻 General SWE");
  });
});

describe("deduplicate", () => {
  it("removes exact duplicate titles", () => {
    const articles = [
      makeArticle({ title: "Same Title", link: "https://a.com" }),
      makeArticle({ title: "Same Title", link: "https://b.com" }),
    ];
    expect(deduplicate(articles)).toHaveLength(1);
    expect(deduplicate(articles)[0].link).toBe("https://a.com");
  });

  it("removes near-duplicates that differ in casing and punctuation", () => {
    const articles = [
      makeArticle({ title: "How to use Docker" }),
      makeArticle({ title: "how to use docker!" }),
    ];
    expect(deduplicate(articles)).toHaveLength(1);
  });

  it("preserves first occurrence", () => {
    const articles = [
      makeArticle({ title: "First", source: "A" }),
      makeArticle({ title: "First", source: "B" }),
    ];
    expect(deduplicate(articles)[0].source).toBe("A");
  });

  it("returns empty array for empty input", () => {
    expect(deduplicate([])).toEqual([]);
  });

  it("preserves order of remaining articles", () => {
    const articles = [
      makeArticle({ title: "Alpha" }),
      makeArticle({ title: "Beta" }),
      makeArticle({ title: "Alpha" }),
      makeArticle({ title: "Gamma" }),
    ];
    const result = deduplicate(articles);
    expect(result.map((a) => a.title)).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});

describe("rankAndSlice", () => {
  it("sorts by score descending", () => {
    const articles = [
      makeArticle({ title: "Low", score: 50 }),
      makeArticle({ title: "High", score: 500 }),
      makeArticle({ title: "Mid", score: 200 }),
    ];
    const result = rankAndSlice(articles);
    expect(result.map((a) => a.title)).toEqual(["High", "Mid", "Low"]);
  });

  it("breaks score ties by publishedAt descending", () => {
    const articles = [
      makeArticle({ title: "Older", score: 100, publishedAt: new Date("2026-01-01") }),
      makeArticle({ title: "Newer", score: 100, publishedAt: new Date("2026-03-01") }),
    ];
    const result = rankAndSlice(articles);
    expect(result[0].title).toBe("Newer");
  });

  it("ranks articles without score below scored articles", () => {
    const articles = [
      makeArticle({ title: "No score" }),
      makeArticle({ title: "Has score", score: 10 }),
    ];
    const result = rankAndSlice(articles);
    expect(result[0].title).toBe("Has score");
  });

  it("slices to MAX_ARTICLES limit", () => {
    const articles = Array.from({ length: 20 }, (_, i) =>
      makeArticle({ title: `Article ${i}`, score: i })
    );
    const result = rankAndSlice(articles);
    expect(result).toHaveLength(15);
  });

  it("returns all articles if count < MAX_ARTICLES", () => {
    const articles = [makeArticle({ title: "Only one" })];
    expect(rankAndSlice(articles)).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(rankAndSlice([])).toEqual([]);
  });
});
