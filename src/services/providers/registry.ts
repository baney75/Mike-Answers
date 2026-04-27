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
    shortDescription: "Best free student start: native image solve, grounding, and audio transcription.",
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
      supportsCustomBaseUrl: false,
      supportsModelCatalog: false,
    },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Your own Gemini key keeps account control with you.",
      retentionSummary: "Retention and logging follow Google's provider policy.",
      trainingSummary: "Training behavior depends on Google's product terms for your key/project.",
      legalNotice: "Review provider terms before uploading sensitive educational or personal data.",
    },
  },
  openrouter: {
    id: "openrouter",
    kind: "openai_compatible",
    label: "OpenRouter",
    shortDescription: "Free-model backup path with broad model discovery and flexible routing.",
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
      supportsCustomBaseUrl: false,
      supportsModelCatalog: true,
    },
    policy: {
      trustTier: "free_trial",
      privacySummary: "Routes through OpenRouter and selected upstream model providers.",
      retentionSummary: "Retention varies by upstream provider and your OpenRouter settings.",
      trainingSummary: "Training policies vary per provider; verify before sharing sensitive content.",
      legalNotice: "Use the provider privacy controls and free-model constraints deliberately.",
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
      supportsCustomBaseUrl: false,
      supportsModelCatalog: false,
    },
    policy: {
      trustTier: "community_experimental",
      privacySummary: "Text and chat focused path for local-first browser use.",
      retentionSummary: "Retention depends on MiniMax account and endpoint settings.",
      trainingSummary: "Training policy should be confirmed in MiniMax account and terms.",
      legalNotice: "Avoid regulated or highly sensitive data unless your compliance review approves it.",
    },
  },
  custom_openai: {
    id: "custom_openai",
    kind: "openai_compatible",
    label: "Custom OpenAI-compatible",
    shortDescription: "Manual base URL, key, and model slots for ChatGPT-compatible or other compatible providers.",
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
      supportsCustomBaseUrl: true,
      supportsModelCatalog: false,
    },
    policy: {
      trustTier: "enterprise_ready",
      privacySummary: "Privacy depends on the provider you configure.",
      retentionSummary: "Retention depends on your configured endpoint and account contract.",
      trainingSummary: "Training usage depends entirely on your chosen provider policy.",
      legalNotice: "You are responsible for verifying data-processing and contractual compliance.",
    },
  },
};

export const providerOrder: ProviderId[] = [
  "gemini",
  "openrouter",
  "minimax",
  "custom_openai",
];

function cloneDefaultConfig(providerId: ProviderId): ProviderPreferenceConfig {
  const descriptor = providerDescriptors[providerId];
  return {
    rememberKey: false,
    baseUrl: descriptor.defaultBaseUrl,
    models: { ...descriptor.defaultModels },
    options: providerId === "openrouter" ? { freeOnly: true } : {},
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
