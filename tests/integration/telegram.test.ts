import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendTelegram } from "../../src/telegram";

const mockFetch = vi.fn();

beforeEach(() => {
  process.env["TELEGRAM_BOT_TOKEN"] = "test-token";
  process.env["TELEGRAM_CHAT_ID"] = "test-chat-id";
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  delete process.env["TELEGRAM_BOT_TOKEN"];
  delete process.env["TELEGRAM_CHAT_ID"];
  vi.restoreAllMocks();
});

describe("sendTelegram", () => {
  it("sends POST to correct Telegram API URL", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await sendTelegram("Hello world");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-token/sendMessage",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("includes correct body fields", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await sendTelegram("<b>Test</b>");

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body["chat_id"]).toBe("test-chat-id");
    expect(body["text"]).toBe("<b>Test</b>");
    expect(body["parse_mode"]).toBe("HTML");
    expect(body["disable_web_page_preview"]).toBe(true);
  });

  it("does not throw on 200 response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await expect(sendTelegram("test")).resolves.toBeUndefined();
  });

  it("throws on non-OK response with status and body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"description":"Bad Request"}'),
    });

    await expect(sendTelegram("test")).rejects.toThrow("Telegram API error 400");
  });

  it("throws on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(sendTelegram("test")).rejects.toThrow("Network error");
  });
});
