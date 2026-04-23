import { describe, expect, test } from "bun:test";

import {
  buildCompactBaseSolutionText,
  buildFollowUpContextPayload,
  buildFollowUpContextText,
  normalizeHistoryItemOriginalContext,
} from "./followUpContext";

describe("follow-up context helpers", () => {
  test("builds a stable context payload with original text and image", () => {
    const payload = buildFollowUpContextPayload({
      solution: "Step 1\n\nDo this.\n\n**Answer:** 42",
      originalContext: {
        text: "Solve x + 1 = 43",
        imageBase64: "abc123",
      },
    });

    expect(payload.originalQuestionText).toBe("Solve x + 1 = 43");
    expect(payload.originalImageBase64).toBe("abc123");
    expect(payload.baseSolutionText.includes("Step 1")).toBe(true);
  });

  test("normalizes legacy history items that only stored request text", () => {
    const normalized = normalizeHistoryItemOriginalContext({
      requestText: "Check my algebra",
    });

    expect(normalized).toEqual({ text: "Check my algebra" });
  });

  test("truncates long base solutions cleanly", () => {
    const longSolution = `${"A".repeat(1200)}.\n\n${"B".repeat(1200)}.\n\n${"C".repeat(1200)}.`;
    const compact = buildCompactBaseSolutionText(longSolution, 2500);

    expect(compact.length <= 2501).toBe(true);
    expect(compact.endsWith("…")).toBe(true);
  });

  test("builds provider-ready follow-up context text", () => {
    const text = buildFollowUpContextText({
      originalQuestionText: "What is 2 + 2?",
      originalImageBase64: "abc123",
      baseSolutionText: "Add the integers carefully.",
    });

    expect(text.includes("Original question:")).toBe(true);
    expect(text.includes("What is 2 + 2?")).toBe(true);
    expect(text.includes("Base solution from the earlier solve:")).toBe(true);
    expect(text.includes("Add the integers carefully.")).toBe(true);
  });
});
