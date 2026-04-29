import { describe, expect, test } from "bun:test";

import { buildOpenAICompatibleTutorConversation, mergeOpenAICompatibleRequestBody } from "./openaiCompatible";

describe("mergeOpenAICompatibleRequestBody", () => {
  test("merges Venice web search defaults for api.venice.ai", () => {
    const merged = mergeOpenAICompatibleRequestBody("https://api.venice.ai/api/v1", {
      model: "zai-org-glm-5",
      messages: [],
    });

    expect(merged.venice_parameters).toEqual({
      enable_web_search: "auto",
      enable_web_citations: true,
    });
  });

  test("preserves user venice_parameter overrides without dropping defaults", () => {
    const merged = mergeOpenAICompatibleRequestBody("https://api.venice.ai/api/v1", {
      model: "x",
      venice_parameters: { strip_thinking_response: true },
    });

    expect(merged.venice_parameters).toEqual({
      enable_web_search: "auto",
      enable_web_citations: true,
      strip_thinking_response: true,
    });
  });

  test("no-op for other provider hosts", () => {
    const body = { model: "gpt-5.4-nano", messages: [{ role: "user", content: "hi" }] };
    expect(mergeOpenAICompatibleRequestBody("https://api.openai.com/v1", body)).toEqual(body);
  });
});

describe("buildOpenAICompatibleTutorConversation", () => {
  test("builds a basic conversation from history and message", () => {
    const messages = buildOpenAICompatibleTutorConversation(
      [
        { role: "user", text: "What is 2+2?" },
        { role: "tutor", text: "2+2 is 4." },
      ],
      "Explain subtraction too.",
    );

    expect(messages.length).toBe(3);
    expect(messages[0]).toEqual({ role: "user", content: [{ type: "text", text: "What is 2+2?" }] });
    expect(messages[1]).toEqual({ role: "assistant", content: [{ type: "text", text: "2+2 is 4." }] });
    expect(messages[2]).toEqual({ role: "user", content: [{ type: "text", text: "Explain subtraction too." }] });
  });

  test("includes follow-up context with original question text", () => {
    const messages = buildOpenAICompatibleTutorConversation(
      [],
      "Follow up",
      {
        originalQuestionText: "Solve 2x + 4 = 10",
        baseSolutionText: "Subtract 4 from both sides, then divide by 2.",
      },
    );

    expect(messages.length >= 2).toBe(true);
    const contextMessage = messages[0];
    expect(contextMessage?.role).toBe("user");
    const content = contextMessage?.content;
    expect(Array.isArray(content)).toBe(true);
    expect(JSON.stringify(content).includes("Solve 2x + 4 = 10")).toBe(true);
    expect(JSON.stringify(content).includes("Subtract 4 from both sides, then divide by 2.")).toBe(true);
  });

  test("includes original image in the synthetic context turn", () => {
    const messages = buildOpenAICompatibleTutorConversation(
      [],
      "What did I miss?",
      {
        originalImageBase64: "abc123",
        baseSolutionText: "Use the quadratic formula.",
      },
    );

    const contextMessage = messages[0];
    expect(contextMessage?.role).toBe("user");
    expect(Array.isArray(contextMessage?.content)).toBe(true);
    expect(JSON.stringify(contextMessage?.content).includes("data:image/jpeg;base64,abc123")).toBe(true);
  });

  test("empty history still produces the user message", () => {
    const messages = buildOpenAICompatibleTutorConversation([], "Hello.");
    expect(messages.length).toBe(1);
    expect(messages[0]).toEqual({ role: "user", content: [{ type: "text", text: "Hello." }] });
  });
});
