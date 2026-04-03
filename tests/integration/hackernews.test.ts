import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchHackerNews } from "../../src/sources/hackernews";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function hnItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Building a distributed system with Kubernetes",
    url: "https://example.com/article",
    score: 200,
    time: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

describe("fetchHackerNews", () => {
  it("fetches top stories and returns relevant articles", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1, 2]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(hnItem({ id: 1, score: 200 })) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(hnItem({ id: 2, score: 150 })) });

    const articles = await fetchHackerNews();
    expect(articles).toHaveLength(2);
    expect(articles[0].source).toContain("HN");
    expect(articles[0].source).toContain("200");
  });

  it("filters out items with score < HN_MIN_SCORE", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(hnItem({ score: 50 })) });

    const articles = await fetchHackerNews();
    expect(articles).toHaveLength(0);
  });

  it("filters out items without a URL", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(hnItem({ url: undefined })) });

    const articles = await fetchHackerNews();
    expect(articles).toHaveLength(0);
  });

  it("filters out items that are not relevant", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1]) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(hnItem({ title: "Best chocolate cake recipe" })),
      });

    const articles = await fetchHackerNews();
    expect(articles).toHaveLength(0);
  });

  it("returns empty array when top stories endpoint fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const articles = await fetchHackerNews();
    expect(articles).toEqual([]);
  });

  it("returns empty array when top stories returns non-OK", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const articles = await fetchHackerNews();
    expect(articles).toEqual([]);
  });

  it("returns empty array when response is not an array", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ error: "bad" }) });

    const articles = await fetchHackerNews();
    expect(articles).toEqual([]);
  });

  it("skips individual items that fail to fetch", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1, 2]) })
      .mockRejectedValueOnce(new Error("Item fetch failed"))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(hnItem({ id: 2 })) });

    const articles = await fetchHackerNews();
    expect(articles).toHaveLength(1);
  });

  it("skips items with missing title", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(hnItem({ title: undefined })) });

    const articles = await fetchHackerNews();
    expect(articles).toHaveLength(0);
  });

  it("handles empty top stories array", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    const articles = await fetchHackerNews();
    expect(articles).toEqual([]);
  });
});
