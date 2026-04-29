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

  test("includes Venice OpenAI-compatible preset", () => {
    const venice = getOpenAICompatiblePreset("venice");
    expect(venice.defaultBaseUrl).toBe("https://api.venice.ai/api/v1");
    expect((venice.modelOptions?.length ?? 0) > 2).toBe(true);
  });

  test("includes DeepInfra as a popular OpenAI-compatible preset with models", () => {
    const preset = getOpenAICompatiblePreset("deepinfra");
    expect(preset.defaultBaseUrl).toBe("https://api.deepinfra.com/v1/openai");
    expect(preset.group).toBe("popular");
    expect((preset.modelOptions?.length ?? 0) >= 5).toBe(true);
    expect(preset.capabilities.supportsImageInputInBrowser).toBe(true);
  });

  test("includes Cohere as a popular OpenAI-compatible preset with models", () => {
    const preset = getOpenAICompatiblePreset("cohere");
    expect(preset.defaultBaseUrl).toBe("https://api.cohere.ai/compatibility/v1");
    expect(preset.group).toBe("popular");
    expect((preset.modelOptions?.length ?? 0) >= 3).toBe(true);
    expect(preset.defaultModels.deepModel).toBe("command-a-03-2025");
    expect(preset.modelOptions?.some((m) => m.id === "command-a-vision-07-2025")).toBe(true);
  });

  test("includes Novita AI as an OpenAI-compatible preset", () => {
    const preset = getOpenAICompatiblePreset("novita");
    expect(preset.defaultBaseUrl).toBe("https://api.novita.ai/v3/openai");
    expect(preset.defaultModels.fastModel).toBe("llama-3.1-8b-instruct");
    expect((preset.modelOptions?.length ?? 0) >= 4).toBe(true);
  });

  test("includes Hugging Face Inference as a popular preset", () => {
    const preset = getOpenAICompatiblePreset("huggingface");
    expect(preset.defaultBaseUrl).toBe("https://router.huggingface.co/hf-inference/v1");
    expect(preset.group).toBe("popular");
    expect((preset.modelOptions?.length ?? 0) >= 4).toBe(true);
  });

  test("includes NVIDIA NIM as an OpenAI-compatible preset", () => {
    const preset = getOpenAICompatiblePreset("nvidia-nim");
    expect(preset.defaultBaseUrl).toBe("https://integrate.api.nvidia.com/v1");
    expect(preset.defaultModels.deepModel).toBe("nvidia/llama-3.1-nemotron-70b-instruct");
    expect((preset.modelOptions?.length ?? 0) >= 3).toBe(true);
  });

  test("includes Google Vertex AI as an OpenAI-compatible preset", () => {
    const preset = getOpenAICompatiblePreset("vertex-ai");
    expect(preset.defaultBaseUrl).toBe("https://us-central1-aiplatform.googleapis.com/v1beta1");
    expect(preset.capabilities.isUserPays).toBe(true);
    expect(preset.defaultModels.fastModel).toBe("google/gemini-2.5-flash");
  });

  test("includes Amazon Bedrock as an OpenAI-compatible enterprise preset", () => {
    const preset = getOpenAICompatiblePreset("bedrock");
    expect(preset.defaultBaseUrl).toBe("https://bedrock-runtime.us-east-1.amazonaws.com/v1");
    expect(preset.capabilities.isUserPays).toBe(true);
    expect(preset.defaultModels.fastModel).toBe("anthropic.claude-haiku-4-5-v1");
    expect((preset.modelOptions?.length ?? 0) >= 4).toBe(true);
  });

  test("includes Azure OpenAI as an enterprise preset", () => {
    const preset = getOpenAICompatiblePreset("azure-openai");
    expect(preset.defaultBaseUrl).toBe("https://YOUR_RESOURCE.openai.azure.com/v1");
    expect(preset.capabilities.supportsCustomBaseUrl).toBe(true);
    expect((preset.modelOptions?.length ?? 0) >= 3).toBe(true);
  });

  test("includes Hyperbolic as a privacy-first preset", () => {
    const preset = getOpenAICompatiblePreset("hyperbolic");
    expect(preset.defaultBaseUrl).toBe("https://api.hyperbolic.xyz/v1");
    expect(preset.policy.trustTier).toBe("community_experimental");
    expect((preset.modelOptions?.length ?? 0) >= 5).toBe(true);
    expect(preset.defaultModels.deepModel).toBe("deepseek-ai/DeepSeek-R1-0528");
  });

  test("includes SiliconFlow as an OpenAI-compatible preset", () => {
    const preset = getOpenAICompatiblePreset("siliconflow");
    expect(preset.defaultBaseUrl).toBe("https://api.siliconflow.cn/v1");
    expect(preset.defaultModels.deepModel).toBe("Qwen/Qwen3.5-397B-A17B");
    expect((preset.modelOptions?.length ?? 0) >= 3).toBe(true);
  });

  test("all new Phase 3 presets have modelOptions with diverse model counts", () => {
    const newPresetIds = [
      "deepinfra", "cohere", "novita", "huggingface", "nvidia-nim", "vertex-ai",
      "bedrock", "azure-openai", "hyperbolic", "siliconflow",
    ];
    for (const id of newPresetIds) {
      const preset = getOpenAICompatiblePreset(id);
      expect((preset.modelOptions?.length ?? 0) > 0).toBe(true);
    }
  });

  test("defaults API key storage to session only", () => {
    const defaults = createDefaultProviderRuntimeConfigs();

    expect(defaults.gemini.rememberKey).toBe(false);
    expect(defaults.openrouter.rememberKey).toBe(false);
    expect(defaults.openai_compatible.rememberKey).toBe(false);
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
      "mistral", "xai", "venice", "perplexity", "cerebras",
      "sambanova", "deepinfra", "cohere", "novita", "huggingface", "nvidia-nim",
      "vertex-ai", "bedrock", "azure-openai", "hyperbolic", "siliconflow",
      "cloudflare-ai-gateway", "vercel-ai-gateway", "litellm",
      "lmstudio",
    ];
    for (const id of allPresets) {
      const preset = getOpenAICompatiblePreset(id);
      expect(preset.docsUrl.length > 0).toBe(true);
      expect(preset.apiKeyPlaceholder.length > 0).toBe(true);
    }
  });
});
