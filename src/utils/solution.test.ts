import { describe, expect, test } from "bun:test";

import {
  embedSourcesInSolution,
  extractEmbeddedSources,
  getCopyableSolution,
  stripRenderMarkers,
  stripSolutionClientArtifacts,
} from "./solution";

describe("solution utils", () => {
  test("extractEmbeddedSources removes the embedded block from the body", () => {
    const solution = embedSourcesInSolution("**Answer:** 4", [
      {
        index: 1,
        title: "MIT OpenCourseWare",
        url: "https://ocw.mit.edu",
        host: "ocw.mit.edu",
        category: "University",
      },
    ]);

    const result = extractEmbeddedSources(solution);

    expect(result.body).toBe("**Answer:** 4");
    expect(result.sources.length).toBe(1);
    expect(result.sources[0]?.host).toBe("ocw.mit.edu");
  });

  test("getCopyableSolution turns embedded sources into readable markdown", () => {
    const solution = embedSourcesInSolution("Line one", [
      {
        index: 1,
        title: "NIH",
        url: "https://nih.gov/example",
        host: "nih.gov",
        category: "Government",
      },
    ]);

    const copied = getCopyableSolution(solution);

    expect(copied.includes("Line one")).toBe(true);
    expect(copied.includes("Sources:")).toBe(true);
    expect(copied.includes("NIH")).toBe(true);
    expect(copied.includes("```aqs-sources")).toBe(false);
  });

  test("stripSolutionClientArtifacts leaves plain solutions untouched", () => {
    expect(stripSolutionClientArtifacts("No markers here.")).toBe("No markers here.");
  });

  test("stripRenderMarkers removes media markers and unwraps definitions", () => {
    const value = [
      'Start here.',
      '[IMAGE_SEARCH: "Burj Khalifa skyline"]',
      '[IMAGE: "Eiffel Tower at dusk"]',
      '[VIDEO_SEARCH: "Pat Benatar Love Is a Battlefield official video"]',
      '[VIDEO: "quadratic formula worked example"]',
      '[WEB_SEARCH: "CDC influenza guidance"]',
      '[WEB: "Khan Academy derivatives"]',
      '[WEATHER: "New York, NY"]',
      '[MAP: "Boston Common"]',
      '[ACTION: show_news]',
      '```chart\n{"type":"line","data":[{"x":0,"y":1}]}\n```',
      '```table\n{"columns":["A"],"rows":[[1]]}\n```',
      '```figure\n{"type":"process","steps":[{"title":"One"}]}\n```',
      '[DEFINITION]\n**osmosis** /ahz-moh-sis/\n*noun*\n1. Movement of solvent.\n[END_DEFINITION]',
    ].join("\n\n");

    const stripped = stripRenderMarkers(value);

    expect(stripped.includes("Start here.")).toBe(true);
    expect(stripped.includes("**osmosis**")).toBe(true);
    expect(stripped.includes("[IMAGE_SEARCH:")).toBe(false);
    expect(stripped.includes("[IMAGE:")).toBe(false);
    expect(stripped.includes("[VIDEO_SEARCH:")).toBe(false);
    expect(stripped.includes("[VIDEO:")).toBe(false);
    expect(stripped.includes("[WEB_SEARCH:")).toBe(false);
    expect(stripped.includes("[WEB:")).toBe(false);
    expect(stripped.includes("[WEATHER:")).toBe(false);
    expect(stripped.includes("[MAP:")).toBe(false);
    expect(stripped.includes("[ACTION:")).toBe(false);
    expect(stripped.includes("```chart")).toBe(false);
    expect(stripped.includes("```table")).toBe(false);
    expect(stripped.includes("```figure")).toBe(false);
    expect(stripped.includes("[Chart included]")).toBe(true);
    expect(stripped.includes("[Table included]")).toBe(true);
    expect(stripped.includes("[Figure included]")).toBe(true);
    expect(stripped.includes("[DEFINITION]")).toBe(false);
  });
});
