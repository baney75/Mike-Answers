import type { ProviderRuntimeConfig } from "../types";

export const MINIMAX_ADVANCED_BRIDGE_ENV = "MINIMAX_ADVANCED_BRIDGE_URL";
export const MINIMAX_ADVANCED_BRIDGE_TOKEN_ENV = "MINIMAX_ADVANCED_BRIDGE_TOKEN";

export function getMiniMaxAdvancedModeEnabled(config: ProviderRuntimeConfig) {
  return Boolean(config.options?.useSecureBackendForAdvanced);
}

export function getMiniMaxBrowserImageSupportMessage() {
  return "MiniMax browser mode supports text and chat only. Enable secure advanced image understanding or switch to Gemini/OpenRouter for direct browser image solves.";
}
