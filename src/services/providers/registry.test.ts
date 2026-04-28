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

  test("all major OpenAI-compatible presets have modelOptions defined", () => {
    const presetIdsWithOptions = [
      "deepseek", "together", "fireworks", "mistral",
      "perplexity", "cerebras", "sambanova",
    ];
    for (const id of presetIdsWithOptions) {
      const preset = getOpenAICompatiblePreset(id);
      const optLen = preset.modelOptions?.length ?? 0;
      expect(optLen > 0).toBe(true);
    }
  });

  test("DeepSeek defaults to V4 models with deprecation notes", () => {
    const deepseek = getOpenAICompatiblePreset("deepseek");
    expect(deepseek.defaultModels.fastModel).toBe("deepseek-v4-flash");
    expect(deepseek.defaultModels.deepModel).toBe("deepseek-v4-pro");
    const legacy = deepseek.modelOptions?.filter((o) => o.id === "deepseek-chat" || o.id === "deepseek-reasoner");
    expect(legacy?.length).toBe(2);
  });

  test("Mistral now supports image input in browser", () => {
    const mistral = getOpenAICompatiblePreset("mistral");
    expect(mistral.capabilities.supportsImageInputInBrowser).toBe(true);
    const visionModels = mistral.modelOptions?.filter((o) => o.supportsImages);
    expect((visionModels?.length ?? 0) > 0).toBe(true);
  });

  test("Perplexity now marks grounding and image support", () => {
    const perplexity = getOpenAICompatiblePreset("perplexity");
    expect(perplexity.capabilities.supportsGrounding).toBe(true);
    expect(perplexity.capabilities.supportsImageInputInBrowser).toBe(true);
    expect((perplexity.modelOptions?.length ?? 0) >= 4).toBe(true);
  });

  test("Cerebras defaults updated from llama3.1-70b to gpt-oss-120b", () => {
    const cerebras = getOpenAICompatiblePreset("cerebras");
    expect(cerebras.defaultModels.deepModel).toBe("gpt-oss-120b");
  });

  test("Every registered provider has a docs URL and key placeholder", () => {
    const allPresets = [
      "openai", "anthropic", "deepseek", "groq", "together", "fireworks",
      "mistral", "xai", "venice", "ollama-cloud", "perplexity", "cerebras",
      "sambanova", "cloudflare-ai-gateway", "vercel-ai-gateway", "litellm",
      "lmstudio", "ollama",
    ];
    for (const id of allPresets) {
      const preset = getOpenAICompatiblePreset(id);
      expect(preset.docsUrl.length > 0).toBe(true);
      expect(preset.apiKeyPlaceholder.length > 0).toBe(true);
    }
  });
});
