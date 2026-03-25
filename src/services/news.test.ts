import { describe, expect, test } from "bun:test";

import { buildNewsReasoningContext, deriveNewsQuery, type NewsArticle } from "./news";

describe("news helpers", () => {
  test("derives a focused query from generic news wording", () => {
    expect(deriveNewsQuery("What's the latest news on AI regulation?")).toBe("ai regulation");
    expect(deriveNewsQuery("Show me today's headlines about the economy")).toBe("economy");
  });

  test("builds reasoning context with direct and primary source links", () => {
    const articles: NewsArticle[] = [
      {
        title: "AI oversight bill advances",
        link: "https://san.com/example",
        description: "Lawmakers advanced an AI oversight bill.",
        pubDate: "2026-03-24T18:00:00Z",
        source: "Straight Arrow News",
        sourceUrl: "https://san.com/feed/",
        sourceBias: "center",
        sourceType: "wire",
        categories: ["Politics"],
        contentHtml: "<p>Lawmakers advanced an AI oversight bill after a committee vote.</p>",
        contentText: "Lawmakers advanced an AI oversight bill after a committee vote.",
        links: [{ href: "https://www.congress.gov/bill/123", text: "bill text" }],
        primarySourceUrl: "https://www.congress.gov/bill/123",
        primarySourceLabel: "bill text",
        directArticleUrl: "https://san.com/example",
      },
    ];

    const context = buildNewsReasoningContext(articles, "AI regulation");

    expect(context.includes("Direct article: https://san.com/example")).toBe(true);
    expect(context.includes("Primary source: https://www.congress.gov/bill/123")).toBe(true);
    expect(context.includes("User topic: AI regulation")).toBe(true);
  });
});
