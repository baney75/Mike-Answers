import { describe, expect, test } from "bun:test";

import { isLikelyHomeworkRequest, shouldAskClarifyingQuestions } from "./request";

describe("request heuristics", () => {
  test("flags explicit homework-style prompts", () => {
    expect(isLikelyHomeworkRequest("Solve this homework problem: find the derivative of x^2.", { subject: "Mathematics" })).toBe(true);
    expect(isLikelyHomeworkRequest("1) Find the limit as x approaches 0.", { subject: "Mathematics" })).toBe(true);
  });

  test("flags image-only schoolwork captures", () => {
    expect(isLikelyHomeworkRequest("", { hasImage: true, subject: "Physics" })).toBe(true);
  });

  test("does not flag ordinary current-fact queries as homework", () => {
    expect(isLikelyHomeworkRequest("Who is the current president of the United States?", { subject: "Auto-detect" })).toBe(false);
  });

  test("asks for clarification on vague prompts", () => {
    expect(shouldAskClarifyingQuestions("research this")).toBe(true);
    expect(shouldAskClarifyingQuestions("help")).toBe(true);
    expect(shouldAskClarifyingQuestions("Find the derivative of x^3")).toBe(false);
  });
});
