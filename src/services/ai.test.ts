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
    providers: createDefaultProviderRuntimeConfigs(),
  };
}

describe("provider readiness", () => {
  test("requires a key before Gemini is considered ready", () => {
    const settings = createSettings("gemini");

    expect(isRuntimeProviderReady(settings)).toBe(false);
    expect(getProviderReadinessLabel(settings)).toBe("Add Gemini key");
  });

  test("treats MiniMax as ready when its key is present because the preset base URL already exists", () => {
    const settings = createSettings("minimax");
    settings.providers.minimax.apiKey = "minimax-test-key";

    expect(isRuntimeProviderReady(settings)).toBe(true);
    expect(getProviderReadinessLabel(settings)).toBe("MiniMax ready");
  });

  test("requires a base URL for custom OpenAI-compatible providers", () => {
    const settings = createSettings("custom_openai");
    settings.providers.custom_openai.apiKey = "custom-key";
    settings.providers.custom_openai.baseUrl = "";

    expect(isRuntimeProviderReady(settings)).toBe(false);
    expect(getProviderReadinessLabel(settings)).toBe("Add Custom OpenAI-compatible base URL");
  });
});

describe("openrouter validation", () => {
  test("blocks non-free models when free-only mode is enabled", () => {
    const settings = createSettings("openrouter");
    settings.providers.openrouter.options = { freeOnly: true };

    expect(validateOpenRouterSelection(settings, "openrouter/free-model", [
      { id: "openrouter/free-model", name: "Free Model", free: true, supportsImages: false },
      { id: "openrouter/paid-model", name: "Paid Model", free: false, supportsImages: true },
    ])).toBe(true);

    expect(validateOpenRouterSelection(settings, "openrouter/paid-model", [
      { id: "openrouter/free-model", name: "Free Model", free: true, supportsImages: false },
      { id: "openrouter/paid-model", name: "Paid Model", free: false, supportsImages: true },
    ])).toBe(false);
  });
});
