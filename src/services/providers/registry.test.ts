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
      "gemini",
      "openrouter",
      "openai_compatible",
      "custom_openai",
    ]);
  });

  test("creates Gemini as the student default route", () => {
    const defaults = createDefaultProviderRuntimeConfigs();

    expect(defaults.gemini.models.fastModel).toBe("gemini-2.5-flash-lite");
    expect(defaults.gemini.models.deepModel).toBe("gemini-2.5-pro");
    expect(getProviderDescriptor("gemini").capabilities.supportsImageInputInBrowser).toBe(true);
    expect(getProviderDescriptor("gemini").capabilities.requiresApiKey).toBe(true);
  });

  test("includes leading ChatGPT, Claude, xAI, and Vercel presets", () => {
    expect(getOpenAICompatiblePreset("openai").label).toBe("ChatGPT / OpenAI");
    expect(getOpenAICompatiblePreset("anthropic").defaultBaseUrl).toBe("https://api.anthropic.com/v1");
    expect(getOpenAICompatiblePreset("xai").defaultBaseUrl).toBe("https://api.x.ai/v1");
    expect(getOpenAICompatiblePreset("vercel-ai-gateway").defaultModels.deepModel).toBe("anthropic/claude-sonnet-4.6");
  });

  test("includes Venice and Ollama Cloud OpenAI-compatible presets", () => {
    const venice = getOpenAICompatiblePreset("venice");
    expect(venice.defaultBaseUrl).toBe("https://api.venice.ai/api/v1");
    expect((venice.modelOptions?.length ?? 0) > 2).toBe(true);

    const ollamaCloud = getOpenAICompatiblePreset("ollama-cloud");
    expect(ollamaCloud.defaultBaseUrl).toBe("https://ollama.com/v1");
    expect(ollamaCloud.capabilities.requiresApiKey).toBe(true);
    expect(ollamaCloud.capabilities.isLocalOnly).toBe(undefined);
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
