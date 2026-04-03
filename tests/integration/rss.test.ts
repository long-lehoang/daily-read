import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockParseURL } = vi.hoisted(() => ({
  mockParseURL: vi.fn(),
}));

vi.mock("../../src/config", async () => {
  const actual = await vi.importActual<typeof import("../../src/config")>("../../src/config");
  return {
    ...actual,
    RSS_FEEDS: [
      { url: "https://test-feed-1.com/rss", source: "Test Feed 1" },
      { url: "https://test-feed-2.com/rss", source: "Test Feed 2" },
    ],
  };
});

vi.mock("rss-parser", () => ({
  default: class MockParser {
    parseURL = mockParseURL;
  },
}));

import { fetchRSSFeeds } from "../../src/sources/rss";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function rssItem(overrides: Record<string, unknown> = {}) {
  return {
    title: "Kubernetes deployment best practices",
    link: "https://example.com/article",
    pubDate: new Date("2026-04-01T06:00:00Z").toISOString(),
    ...overrides,
  };
}

describe("fetchRSSFeeds", () => {
  it("parses feeds and returns relevant articles", async () => {
    mockParseURL.mockResolvedValue({ items: [rssItem()] });

    const articles = await fetchRSSFeeds();
    expect(articles.length).toBeGreaterThanOrEqual(1);
    expect(articles[0].source).toBe("Test Feed 1");
  });

  it("filters items older than LOOKBACK_HOURS", async () => {
    mockParseURL.mockResolvedValue({
      items: [rssItem({ pubDate: new Date("2026-03-28T00:00:00Z").toISOString() })],
    });

    const articles = await fetchRSSFeeds();
    expect(articles).toHaveLength(0);
  });

  it("filters out items that are not relevant", async () => {
    mockParseURL.mockResolvedValue({
      items: [rssItem({ title: "Best chocolate cake recipe" })],
    });

    const articles = await fetchRSSFeeds();
    expect(articles).toHaveLength(0);
  });

  it("skips items without pubDate", async () => {
    mockParseURL.mockResolvedValue({
      items: [rssItem({ pubDate: undefined })],
    });

    const articles = await fetchRSSFeeds();
    expect(articles).toHaveLength(0);
  });

  it("takes only first 10 items per feed", async () => {
    const items = Array.from({ length: 15 }, (_, i) =>
      rssItem({ title: `Kubernetes article ${i}`, link: `https://example.com/${i}` })
    );
    mockParseURL.mockResolvedValue({ items });

    const articles = await fetchRSSFeeds();
    expect(articles.length).toBeLessThanOrEqual(20);
  });

  it("skips feed that fails to parse", async () => {
    mockParseURL
      .mockRejectedValueOnce(new Error("Invalid XML"))
      .mockResolvedValueOnce({ items: [rssItem()] });

    const articles = await fetchRSSFeeds();
    expect(articles.length).toBeGreaterThanOrEqual(1);
  });

  it("logs warning for failed feeds", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockParseURL.mockRejectedValue(new Error("Feed timeout"));

    await fetchRSSFeeds();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns articles from successful feeds even when some fail", async () => {
    mockParseURL
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce({ items: [rssItem()] });

    const articles = await fetchRSSFeeds();
    expect(articles.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array when all feeds fail", async () => {
    mockParseURL.mockRejectedValue(new Error("All fail"));

    const articles = await fetchRSSFeeds();
    expect(articles).toEqual([]);
  });

  it("handles feed with zero items", async () => {
    mockParseURL.mockResolvedValue({ items: [] });

    const articles = await fetchRSSFeeds();
    expect(articles).toEqual([]);
  });
});
