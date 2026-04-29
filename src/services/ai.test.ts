import { describe, expect, test } from "bun:test";

import type { RuntimeAISettings } from "../types";
import { createDefaultProviderRuntimeConfigs } from "./providers/registry";
import { getProviderReadinessLabel, isRuntimeProviderReady, validateOpenRouterSelection } from "./ai";

function createSettings(selectedProviderId: RuntimeAISettings["selectedProviderId"]): RuntimeAISettings {
  return {
    selectedProviderId,
    preferredSubject: "Auto-detect",
    preferredLocation: "",
    onboardingCompleted: false,
    freeModeEnabled: false,
    legalAcceptedAt: undefined,
    providers: createDefaultProviderRuntimeConfigs(),
  };
}

describe("provider readiness", () => {
  test("requires a key before Gemini is considered ready", () => {
    const settings = createSettings("gemini");

    expect(isRuntimeProviderReady(settings)).toBe(false);
    expect(getProviderReadinessLabel(settings)).toBe("Add Gemini key");
  });

  test("defaults local LM Studio style routes to no-key readiness when configured", () => {
    const settings = createSettings("openai_compatible");
    settings.providers.openai_compatible.options = { presetId: "lmstudio" };
    settings.providers.openai_compatible.baseUrl = "http://localhost:1234/v1";

    expect(isRuntimeProviderReady(settings)).toBe(true);
    expect(getProviderReadinessLabel(settings)).toBe("LM Studio ready");
  });

  test("allows no-key local route when its base URL is configured", () => {
    const settings = createSettings("openai_compatible");
    settings.providers.openai_compatible.options = { presetId: "lmstudio" };
    settings.providers.openai_compatible.baseUrl = "http://localhost:1234/v1";
    settings.providers.openai_compatible.models = { fastModel: "local-model", deepModel: "local-model" };

    expect(isRuntimeProviderReady(settings)).toBe(true);
    expect(getProviderReadinessLabel(settings)).toBe("LM Studio ready");
  });

  test("requires a base URL for custom OpenAI-compatible providers", () => {
    const settings = createSettings("custom_openai");
    settings.providers.custom_openai.apiKey = "custom-key";
    settings.providers.custom_openai.baseUrl = "";

    expect(isRuntimeProviderReady(settings)).toBe(false);
    expect(getProviderReadinessLabel(settings)).toBe("Add Custom OpenAI-compatible base URL");
  });

  test("rejects invalid custom OpenAI-compatible base URLs", () => {
    const settings = createSettings("custom_openai");
    settings.providers.custom_openai.apiKey = "custom-key";
    settings.providers.custom_openai.baseUrl = "javascript:alert(1)";

    expect(isRuntimeProviderReady(settings)).toBe(false);
    expect(getProviderReadinessLabel(settings)).toBe("Fix Custom OpenAI-compatible base URL");
  });
});

describe("openrouter validation", () => {
  test("blocks non-free models when free-only mode is enabled", () => {
    const settings = createSettings("openrouter");
    settings.providers.openrouter.options = { freeOnly: true };

    expect(validateOpenRouterSelection(settings, "openrouter/free-model", [
      { id: "openrouter/free-model", name: "Free Model", free: true, supportsImages: false, contextLength: 4096, inputModalities: ["text"] },
      { id: "openrouter/paid-model", name: "Paid Model", free: false, supportsImages: true, contextLength: 4096, inputModalities: ["text"] },
    ])).toBe(true);

    expect(validateOpenRouterSelection(settings, "openrouter/paid-model", [
      { id: "openrouter/free-model", name: "Free Model", free: true, supportsImages: false, contextLength: 4096, inputModalities: ["text"] },
      { id: "openrouter/paid-model", name: "Paid Model", free: false, supportsImages: true, contextLength: 4096, inputModalities: ["text"] },
    ])).toBe(false);
  });
});
