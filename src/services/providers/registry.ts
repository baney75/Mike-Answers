import type {
  ProviderDescriptor,
  ProviderId,
  ProviderPreferenceConfig,
  ProviderRuntimeConfig,
} from "../../types";

export const providerDescriptors: Record<ProviderId, ProviderDescriptor> = {
  gemini: {
    id: "gemini",
    kind: "gemini_native",
    label: "Gemini",
    shortDescription: "Google-native routing with grounding and audio transcription.",
    docsUrl: "https://aistudio.google.com/app/apikey",
    apiKeyPlaceholder: "AIza...",
    defaultModels: {
      fastModel: "gemini-2.5-flash-lite",
      deepModel: "gemini-2.5-pro",
      groundedModel: "gemini-2.5-flash",
      transcriptionModel: "gemini-2.5-flash-lite",
    },
    capabilities: {
      supportsGrounding: true,
      supportsImageInputInBrowser: true,
      supportsAudioTranscription: true,
      supportsSecureAdvanced: false,
      supportsCustomBaseUrl: false,
      supportsModelCatalog: false,
    },
  },
  openrouter: {
    id: "openrouter",
    kind: "openai_compatible",
    label: "OpenRouter",
    shortDescription: "Free-first OpenAI-compatible routing with model discovery.",
    docsUrl: "https://openrouter.ai/keys",
    apiKeyPlaceholder: "sk-or-v1-...",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModels: {
      fastModel: "",
      deepModel: "",
    },
    capabilities: {
      supportsGrounding: false,
      supportsImageInputInBrowser: true,
      supportsAudioTranscription: false,
      supportsSecureAdvanced: false,
      supportsCustomBaseUrl: false,
      supportsModelCatalog: true,
    },
  },
  minimax: {
    id: "minimax",
    kind: "openai_compatible",
    label: "MiniMax",
    shortDescription: "Fast browser-safe text/chat plus optional secure advanced image tools.",
    docsUrl: "https://platform.minimax.io/docs/api-reference/text-openai-api",
    apiKeyPlaceholder: "Enter MiniMax API key",
    defaultBaseUrl: "https://api.minimax.io/v1",
    defaultModels: {
      fastModel: "MiniMax-M2.7-highspeed",
      deepModel: "MiniMax-M2.7",
    },
    capabilities: {
      supportsGrounding: false,
      supportsImageInputInBrowser: false,
      supportsAudioTranscription: false,
      supportsSecureAdvanced: true,
      supportsCustomBaseUrl: false,
      supportsModelCatalog: false,
    },
  },
  custom_openai: {
    id: "custom_openai",
    kind: "openai_compatible",
    label: "Custom OpenAI-compatible",
    shortDescription: "Manual base URL, key, and model slots for compatible providers.",
    docsUrl: "https://platform.openai.com/docs/api-reference",
    apiKeyPlaceholder: "Enter API key",
    defaultBaseUrl: "",
    defaultModels: {
      fastModel: "",
      deepModel: "",
    },
    capabilities: {
      supportsGrounding: false,
      supportsImageInputInBrowser: false,
      supportsAudioTranscription: false,
      supportsSecureAdvanced: false,
      supportsCustomBaseUrl: true,
      supportsModelCatalog: false,
    },
  },
};

export const providerOrder: ProviderId[] = [
  "openrouter",
  "gemini",
  "minimax",
  "custom_openai",
];

function cloneDefaultConfig(providerId: ProviderId): ProviderPreferenceConfig {
  const descriptor = providerDescriptors[providerId];
  return {
    rememberKey: false,
    baseUrl: descriptor.defaultBaseUrl,
    models: { ...descriptor.defaultModels },
    options: providerId === "openrouter"
      ? { freeOnly: true }
      : providerId === "minimax"
        ? { useSecureBackendForAdvanced: false }
        : {},
  };
}

export function createDefaultProviderPreferences(): Record<ProviderId, ProviderPreferenceConfig> {
  return {
    gemini: cloneDefaultConfig("gemini"),
    openrouter: cloneDefaultConfig("openrouter"),
    minimax: cloneDefaultConfig("minimax"),
    custom_openai: cloneDefaultConfig("custom_openai"),
  };
}

export function createDefaultProviderRuntimeConfigs(): Record<ProviderId, ProviderRuntimeConfig> {
  return {
    gemini: { ...cloneDefaultConfig("gemini") },
    openrouter: { ...cloneDefaultConfig("openrouter") },
    minimax: { ...cloneDefaultConfig("minimax") },
    custom_openai: { ...cloneDefaultConfig("custom_openai") },
  };
}

export function getProviderDescriptor(providerId: ProviderId) {
  return providerDescriptors[providerId];
}

export function getProviderLabel(providerId: ProviderId) {
  return providerDescriptors[providerId].label;
}
