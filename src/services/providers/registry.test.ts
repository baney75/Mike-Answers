import { describe, expect, test } from "bun:test";

import {
  createDefaultProviderRuntimeConfigs,
  getProviderDescriptor,
  providerDescriptors,
  providerOrder,
} from "./registry";

describe("provider registry", () => {
  test("keeps the supported provider order stable", () => {
    expect(providerOrder).toEqual([
      "gemini",
      "openrouter",
      "minimax",
      "custom_openai",
    ]);
  });

  test("creates MiniMax defaults with its official OpenAI-compatible endpoint", () => {
    const defaults = createDefaultProviderRuntimeConfigs();

    expect(defaults.minimax.baseUrl).toBe("https://api.minimax.io/v1");
    expect(defaults.minimax.models.fastModel).toBe("MiniMax-M2.7-highspeed");
    expect(defaults.minimax.models.deepModel).toBe("MiniMax-M2.7");
  });

  test("defaults API key storage to session only", () => {
    const defaults = createDefaultProviderRuntimeConfigs();

    expect(defaults.gemini.rememberKey).toBe(false);
    expect(defaults.openrouter.rememberKey).toBe(false);
  });

  test("marks MiniMax browser limitations honestly", () => {
    const minimax = getProviderDescriptor("minimax");

    expect(minimax.capabilities.supportsImageInputInBrowser).toBe(false);
    expect(minimax.capabilities.supportsAudioTranscription).toBe(false);
  });

  test("marks the custom provider as manual and base-url configurable", () => {
    const custom = providerDescriptors.custom_openai;

    expect(custom.kind).toBe("openai_compatible");
    expect(custom.capabilities.supportsCustomBaseUrl).toBe(true);
    expect(custom.defaultBaseUrl).toBe("");
  });
});
