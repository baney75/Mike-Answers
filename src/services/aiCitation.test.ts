import { describe, expect, test } from "bun:test";

import { buildAiCitations } from "./aiCitation";

describe("AI citation helper", () => {
  test("uses the original generated date and avoids duplicate punctuation", () => {
    const citations = buildAiCitations({
      providerId: "gemini",
      providerLabel: "Gemini",
      model: "gemini-2.5-flash",
      prompt: "Explain why vaccines train immune memory and cite sources.",
      generatedAt: "2026-04-25T19:30:00.000Z",
      appName: "Mike Answers",
      appUrl: "https://example.test",
    });

    expect(citations.apa.includes("Google. (2026). gemini-2.5-flash [Large language model].")).toBe(true);
    expect(citations.apa.includes("April 25, 2026")).toBe(true);
    expect(citations.apa.includes("April 27, 2026")).toBe(false);
    expect(citations.chicago.includes('response to "Explain why vaccines train immune memory and cite sources,"')).toBe(true);
    expect(citations.chicago.includes("sources..")).toBe(false);
  });

  test("formats MLA with model and provider metadata", () => {
    const citations = buildAiCitations({
      providerId: "openrouter",
      providerLabel: "OpenRouter",
      model: "openrouter/free",
      prompt: "Summarize this article",
      generatedAt: "2026-01-05T12:00:00.000Z",
      appName: "Mike Answers",
    });

    expect(citations.mla.includes('"Summarize this article" prompt.')).toBe(true);
    expect(citations.mla.includes("OpenRouter, model openrouter/free, OpenRouter")).toBe(true);
    expect(citations.mla.includes("https://openrouter.ai/")).toBe(true);
  });
});
