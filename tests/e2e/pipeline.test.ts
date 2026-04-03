import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockParseURL } = vi.hoisted(() => ({
  mockParseURL: vi.fn(),
}));

vi.mock("../../src/config", async () => {
  const actual = await vi.importActual<typeof import("../../src/config")>("../../src/config");
  return {
    ...actual,
    RSS_FEEDS: [{ url: "https://test-feed.com/rss", source: "Test Feed" }],
  };
});

vi.mock("rss-parser", () => ({
  default: class {
    parseURL = mockParseURL;
  },
}));

import { fetchHackerNews } from "../../src/sources/hackernews";
import { fetchRSSFeeds } from "../../src/sources/rss";
import { deduplicate, rankAndSlice } from "../../src/filter";
import { buildMessage } from "../../src/formatter";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function hnItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Kubernetes cluster management guide",
    url: "https://hn.example.com/article",
    score: 200,
    time: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

function rssItem(overrides: Record<string, unknown> = {}) {
  return {
    title: "React 19 new features overview",
    link: "https://rss.example.com/article",
    pubDate: new Date("2026-04-01T06:00:00Z").toISOString(),
    ...overrides,
  };
}

describe("Full pipeline", () => {
  it("runs end-to-end with HN + RSS and produces valid message", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(hnItem()) });

    mockParseURL.mockResolvedValueOnce({ items: [rssItem()] });

    const [hn, rss] = await Promise.all([fetchHackerNews(), fetchRSSFeeds()]);
    const combined = [...hn, ...rss];
    const unique = deduplicate(combined);
    const articles = rankAndSlice(unique);

    expect(articles).toHaveLength(2);

    const message = buildMessage(articles);
    expect(message).toContain("Tech Digest");
    expect(message).toContain("Kubernetes");
    expect(message).toContain("React");
    expect(message.length).toBeLessThanOrEqual(4096);
  });

  it("deduplicates articles from different sources", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1]) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(hnItem({ title: "Kubernetes best practices" })),
      });

    mockParseURL.mockResolvedValueOnce({
      items: [rssItem({ title: "Kubernetes best practices" })],
    });

    const [hn, rss] = await Promise.all([fetchHackerNews(), fetchRSSFeeds()]);
    const unique = deduplicate([...hn, ...rss]);

    expect(unique).toHaveLength(1);
  });

  it("produces message when HN fails but RSS succeeds", async () => {
    mockFetch.mockRejectedValueOnce(new Error("HN down"));
    mockParseURL.mockResolvedValueOnce({ items: [rssItem()] });

    const [hn, rss] = await Promise.all([fetchHackerNews(), fetchRSSFeeds()]);
    const articles = rankAndSlice(deduplicate([...hn, ...rss]));
    const message = buildMessage(articles);

    expect(hn).toEqual([]);
    expect(articles.length).toBeGreaterThanOrEqual(1);
    expect(message).toContain("React");
  });

  it("produces message when RSS fails but HN succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(hnItem()) });

    mockParseURL.mockRejectedValueOnce(new Error("RSS down"));

    const [hn, rss] = await Promise.all([fetchHackerNews(), fetchRSSFeeds()]);
    const articles = rankAndSlice(deduplicate([...hn, ...rss]));
    const message = buildMessage(articles);

    expect(rss).toEqual([]);
    expect(articles.length).toBeGreaterThanOrEqual(1);
    expect(message).toContain("Kubernetes");
  });

  it("sends fallback when both sources fail", async () => {
    mockFetch.mockRejectedValueOnce(new Error("HN down"));
    mockParseURL.mockRejectedValueOnce(new Error("RSS down"));

    const [hn, rss] = await Promise.all([fetchHackerNews(), fetchRSSFeeds()]);
    const articles = rankAndSlice(deduplicate([...hn, ...rss]));
    const message = buildMessage(articles);

    expect(articles).toEqual([]);
    expect(message).toContain("No relevant articles found");
  });

  it("sends fallback when articles exist but none pass relevance filter", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1]) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(hnItem({ title: "Best chocolate cake recipe", score: 500 })),
      });

    mockParseURL.mockResolvedValueOnce({
      items: [rssItem({ title: "Top 10 vacation spots" })],
    });

    const [hn, rss] = await Promise.all([fetchHackerNews(), fetchRSSFeeds()]);
    const articles = rankAndSlice(deduplicate([...hn, ...rss]));
    const message = buildMessage(articles);

    expect(articles).toEqual([]);
    expect(message).toContain("No relevant articles found");
  });
});
