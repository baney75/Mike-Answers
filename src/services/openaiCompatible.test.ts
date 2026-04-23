import { describe, expect, test } from "bun:test";

import { buildOpenAICompatibleTutorConversation } from "./openaiCompatible";

describe("openai-compatible tutor conversation", () => {
  test("keeps the original solution context even after prior follow-up turns exist", () => {
    const messages = buildOpenAICompatibleTutorConversation(
      [
        { role: "user", text: "Check step 2." },
        { role: "tutor", text: "Step 2 subtracts 4 from both sides." },
      ],
      "Now show me step 3.",
      {
        originalQuestionText: "Solve 2x + 4 = 10",
        baseSolutionText: "Subtract 4 from both sides, then divide both sides by 2.",
      },
    );

    const contextMessage = messages[0];
    expect(contextMessage?.role).toBe("user");
    expect(Array.isArray(contextMessage?.content)).toBe(true);
    expect(JSON.stringify(contextMessage?.content).includes("Solve 2x + 4 = 10")).toBe(true);
    expect(
      JSON.stringify(contextMessage?.content).includes("Subtract 4 from both sides, then divide both sides by 2."),
    ).toBe(true);

    expect(messages.at(-1)).toEqual({
      role: "user",
      content: "Now show me step 3.",
    });
  });

  test("includes the persisted original image in the synthetic context turn", () => {
    const messages = buildOpenAICompatibleTutorConversation(
      [],
      "What did I miss?",
      {
        originalImageBase64: "abc123",
        baseSolutionText: "Use the quadratic formula after rearranging the equation.",
      },
    );

    const contextMessage = messages[0];
    expect(contextMessage?.role).toBe("user");
    expect(Array.isArray(contextMessage?.content)).toBe(true);
    expect(JSON.stringify(contextMessage?.content).includes("data:image/jpeg;base64,abc123")).toBe(true);
    expect(JSON.stringify(contextMessage?.content).includes("Base solution from the earlier solve:")).toBe(true);
  });
});
