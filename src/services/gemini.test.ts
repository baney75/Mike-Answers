import { describe, expect, test } from "bun:test";

import {
  buildRequestPlan,
  buildGeminiTutorContents,
  extractReliableSources,
  getSourceIntent,
  isRateLimitIssue,
  stripTrailingSourcesSection,
} from "./gemini";

describe("gemini routing", () => {
  test("auto-enables grounding for citation-sensitive prompts", () => {
    const plan = buildRequestPlan("fast", "Cite current sources about influenza guidelines.", false);

    expect(plan.useGrounding).toBe(true);
  });

  test("auto-enables pro routing for complex walkthroughs", () => {
    const plan = buildRequestPlan("fast", "Prove the spectral theorem and explain each step rigorously.", false);

    expect(plan.modelCandidates.includes("gemini-2.5-pro")).toBe(true);
  });

  test("auto-enables grounding for current officeholder prompts", () => {
    const plan = buildRequestPlan("fast", "Who is the current president of the United States?", false);

    expect(plan.useGrounding).toBe(true);
  });

  test("auto-enables grounding for quoted-source prompts", () => {
    const plan = buildRequestPlan("fast", 'Who said "The only thing we have to fear is fear itself" and where is it from?', false);

    expect(plan.useGrounding).toBe(true);
  });

  test("strips trailing raw sources sections from model text", () => {
    const cleaned = stripTrailingSourcesSection("Body text\n\nSources:\n1. https://example.edu\n2. https://nih.gov");

    expect(cleaned).toBe("Body text");
  });

  test("detects rate-limit style errors", () => {
    expect(isRateLimitIssue("429 RESOURCE_EXHAUSTED: quota exceeded")).toBe(true);
    expect(isRateLimitIssue("Too many requests, please slow down")).toBe(true);
    expect(isRateLimitIssue("404 model not found")).toBe(false);
  });
});

describe("grounded source extraction", () => {
  test("detects scholarly and news intent separately", () => {
    expect(getSourceIntent("Find peer-reviewed journal sources on CRISPR.")).toBe("scholarly");
    expect(getSourceIntent("What is the latest news on the ceasefire talks?")).toBe("news");
  });

  test("prefers academically credible sources and removes low-trust hosts", () => {
    const sources = extractReliableSources({
      groundingChunks: [
        { web: { uri: "https://brainly.com/question/1", title: "Brainly thread" } },
        { web: { uri: "https://ocw.mit.edu/example", title: "MIT OpenCourseWare" } },
        { web: { uri: "https://www.nih.gov/example", title: "NIH Guidance" } },
      ],
    }, "Use scholarly sources for this biology question.");

    expect(sources.length).toBe(2);
    expect(sources[0]?.category).toBe("University");
    expect(sources[1]?.category).toBe("Government / Official");
  });

  test("prefers high-trust newsrooms for news prompts", () => {
    const sources = extractReliableSources({
      groundingChunks: [
        { web: { uri: "https://www.reuters.com/world/example", title: "Reuters dispatch" } },
        { web: { uri: "https://www.example.com/opinion", title: "Opinion blog" } },
        { web: { uri: "https://apnews.com/article/example", title: "AP report" } },
      ],
    }, "Give me the latest news sources on this event.");

    expect(sources.length).toBe(2);
    expect(sources[0]?.host.includes("reuters.com") || sources[1]?.host.includes("reuters.com")).toBe(true);
    expect(sources[0]?.host.includes("apnews.com") || sources[1]?.host.includes("apnews.com")).toBe(true);
  });

  test("keeps curated newsroom sources when stronger wire services are absent", () => {
    const sources = extractReliableSources({
      groundingChunks: [
        { web: { uri: "https://san.com/article/example", title: "Straight Arrow News report" } },
        { web: { uri: "https://www.wsj.com/world/example", title: "WSJ world report" } },
        { web: { uri: "https://www.example.com/opinion", title: "Opinion blog" } },
      ],
    }, "What is the latest news on this event?");

    expect(sources.length).toBe(2);
    expect(sources[0]?.host.includes("san.com") || sources[1]?.host.includes("san.com")).toBe(true);
    expect(sources[0]?.host.includes("wsj.com") || sources[1]?.host.includes("wsj.com")).toBe(true);
  });

  test("uses title-derived hosts when grounding URIs are Google proxy links", () => {
    const sources = extractReliableSources({
      groundingChunks: [
        {
          web: {
            uri: "https://vertexaisearch.cloud.google.com/result/123",
            title: "parliament.uk",
          },
        },
      ],
    }, "Use official sources for this history question.");

    expect(sources.length).toBe(1);
    expect(sources[0]?.host).toBe("parliament.uk");
    expect(sources[0]?.category).toBe("Government / Official");
  });

  test("drops tertiary and advocacy sources when better options are available", () => {
    const sources = extractReliableSources({
      groundingChunks: [
        { web: { uri: "https://vertexaisearch.cloud.google.com/result/1", title: "wikipedia.org" } },
        { web: { uri: "https://vertexaisearch.cloud.google.com/result/2", title: "amnesty.org" } },
        { web: { uri: "https://www.reuters.com/world/example", title: "Reuters report" } },
      ],
    }, "Give me the latest news sources on this event.");

    expect(sources.length).toBe(1);
    expect(sources[0]?.host).toBe("reuters.com");
  });
});

describe("follow-up tutor context", () => {
  test("keeps the original solution context on later follow-up turns", () => {
    const contents = buildGeminiTutorContents(
      [
        { role: "user", text: "Can you re-check step 2?" },
        { role: "tutor", text: "Step 2 subtracts 4 from each side." },
      ],
      "Now show me step 3.",
      {
        originalQuestionText: "Solve 2x + 4 = 10",
        baseSolutionText: "Subtract 4 from both sides and divide by 2.",
      },
    );

    expect(contents[0]?.role).toBe("user");
    expect(JSON.stringify(contents[0]?.parts).includes("Solve 2x + 4 = 10")).toBe(true);
    expect(JSON.stringify(contents[0]?.parts).includes("Subtract 4 from both sides and divide by 2.")).toBe(true);
    expect(contents[1]?.role).toBe("model");
    expect(contents.at(-1)).toEqual({
      role: "user",
      parts: [{ text: "Now show me step 3." }],
    });
  });

  test("includes the original image in the synthetic Gemini context turn", () => {
    const contents = buildGeminiTutorContents(
      [],
      "What mistake did I make?",
      {
        originalImageBase64: "abc123",
        baseSolutionText: "Expand the brackets before combining like terms.",
      },
    );

    expect(contents[0]?.role).toBe("user");
    expect(contents[0]?.parts[0]?.inlineData?.data).toBe("abc123");
    expect(JSON.stringify(contents[0]?.parts).includes("Base solution from the earlier solve:")).toBe(true);
  });
});
