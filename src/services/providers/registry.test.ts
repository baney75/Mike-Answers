import { describe, expect, test } from "bun:test";

import {
  createDefaultProviderRuntimeConfigs,
  getOpenAICompatiblePreset,
  getProviderDescriptor,
  providerDescriptors,
  providerOrder,
} from "./registry";

describe("provider registry", () => {
  test("keeps the supported provider order stable", () => {
    expect(providerOrder).toEqual([
      "puter",
      "gemini",
      "openrouter",
      "openai_compatible",
      "custom_openai",
    ]);
  });

  test("creates Puter as the no-key default route", () => {
    const defaults = createDefaultProviderRuntimeConfigs();

    expect(defaults.puter.models.fastModel).toBe("gpt-5-nano");
    expect(defaults.puter.models.deepModel).toBe("gpt-5.4");
    expect(getProviderDescriptor("puter").capabilities.requiresApiKey).toBe(false);
    expect(getProviderDescriptor("puter").capabilities.isUserPays).toBe(true);
  });

  test("defaults API key storage to session only", () => {
    const defaults = createDefaultProviderRuntimeConfigs();

    expect(defaults.gemini.rememberKey).toBe(false);
    expect(defaults.openrouter.rememberKey).toBe(false);
    expect(defaults.openai_compatible.rememberKey).toBe(false);
  });

  test("includes Ollama as a local OpenAI-compatible preset", () => {
    const ollama = getOpenAICompatiblePreset("ollama");

    expect(ollama?.defaultBaseUrl).toBe("http://localhost:11434/v1");
    expect(ollama?.capabilities.requiresApiKey).toBe(false);
    expect(ollama?.capabilities.isLocalOnly).toBe(true);
  });

  test("marks the custom provider as manual and base-url configurable", () => {
    const custom = providerDescriptors.custom_openai;

    expect(custom.kind).toBe("openai_compatible");
    expect(custom.capabilities.supportsCustomBaseUrl).toBe(true);
    expect(custom.defaultBaseUrl).toBe("");
  });
});
