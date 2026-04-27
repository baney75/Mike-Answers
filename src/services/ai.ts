import type {
  OpenRouterModelSummary,
  PromptRuntimeContext,
  ProviderId,
  RuntimeAISettings,
  SolveMode,
} from "../types";
import type { FollowUpContextPayload } from "../utils/followUpContext";
import {
  chatWithTutor as chatWithGemini,
  resolveGeminiApiKey,
  solveQuestion as solveGeminiImageQuestion,
  solveTextQuestion as solveGeminiTextQuestion,
  transcribeAudio as transcribeWithGemini,
} from "./gemini";
import { getMiniMaxBrowserImageSupportMessage } from "./minimax";
import {
  chatWithOpenAICompatible,
  solveImageQuestionWithOpenAICompatible,
  solveTextQuestionWithOpenAICompatible,
} from "./openaiCompatible";
import {
  chooseRecommendedOpenRouterModel,
  fetchFreeOpenRouterModels,
  fetchOpenRouterModels,
  isFreeOpenRouterModel,
} from "./openrouter";
import { getProviderDescriptor, getProviderLabel } from "./providers/registry";
import { normalizeProviderBaseUrl } from "../utils/urlSafety";

const OPENROUTER_FREE_ROUTER_MODEL = "openrouter/free";
const OPENROUTER_SHARED_FREE_KEY =
  (import.meta.env.VITE_OPENROUTER_FREE_API_KEY as string | undefined)?.trim() ?? "";
const FREE_MODE_LIMIT_WINDOW_MS = 60_000;
const FREE_MODE_MAX_REQUESTS_PER_WINDOW = 12;

let freeModeWindowStartedAt = 0;
let freeModeWindowCount = 0;

export function isSharedFreeModeAvailable() {
  return Boolean(OPENROUTER_SHARED_FREE_KEY);
}

function getSelectedProviderId(settings: RuntimeAISettings): ProviderId {
  return settings.selectedProviderId;
}

function getSelectedProviderConfig(settings: RuntimeAISettings) {
  return settings.providers[getSelectedProviderId(settings)];
}

function getProviderApiKey(settings: RuntimeAISettings, providerId = getSelectedProviderId(settings)) {
  const config = settings.providers[providerId];

  if (providerId === "gemini") {
    return resolveGeminiApiKey(config.apiKey);
  }

  if (providerId === "openrouter") {
    const userKey = config.apiKey?.trim() ?? "";
    if (userKey) {
      return userKey;
    }
    if (settings.freeModeEnabled && settings.legalAcceptedAt && OPENROUTER_SHARED_FREE_KEY) {
      return OPENROUTER_SHARED_FREE_KEY;
    }
  }

  return config.apiKey?.trim() ?? "";
}

function enforceFreeModeRateLimit(settings: RuntimeAISettings) {
  const providerId = getSelectedProviderId(settings);
  if (providerId !== "openrouter") {
    return;
  }
  const userProvidedKey = settings.providers.openrouter.apiKey?.trim();
  if (userProvidedKey) {
    return;
  }
  if (!(settings.freeModeEnabled && settings.legalAcceptedAt)) {
    return;
  }

  const now = Date.now();
  if (now - freeModeWindowStartedAt > FREE_MODE_LIMIT_WINDOW_MS) {
    freeModeWindowStartedAt = now;
    freeModeWindowCount = 0;
  }
  freeModeWindowCount += 1;
  if (freeModeWindowCount > FREE_MODE_MAX_REQUESTS_PER_WINDOW) {
    throw new Error("Free mode is rate-limited. Wait a minute or add your own API key for higher reliability.");
  }
}

function isSharedFreeMode(settings: RuntimeAISettings) {
  const providerId = getSelectedProviderId(settings);
  if (providerId !== "openrouter") {
    return false;
  }
  const userProvidedKey = settings.providers.openrouter.apiKey?.trim();
  return !userProvidedKey && Boolean(settings.freeModeEnabled && settings.legalAcceptedAt && OPENROUTER_SHARED_FREE_KEY);
}

function requireProviderApiKey(settings: RuntimeAISettings, providerId = getSelectedProviderId(settings)) {
  const apiKey = getProviderApiKey(settings, providerId);
  if (!apiKey) {
    throw new Error(`Add your ${getProviderLabel(providerId)} API key in Setup before using it.`);
  }

  return apiKey;
}

function getProviderBaseUrl(settings: RuntimeAISettings, providerId = getSelectedProviderId(settings)) {
  const descriptor = getProviderDescriptor(providerId);
  const configured = settings.providers[providerId].baseUrl?.trim();
  return configured || descriptor.defaultBaseUrl || "";
}

function requireOpenAICompatibleBaseUrl(settings: RuntimeAISettings, providerId: ProviderId) {
  const configured = getProviderBaseUrl(settings, providerId);
  if (!configured) {
    throw new Error(`Add a base URL for ${getProviderLabel(providerId)} in Setup before using it.`);
  }

  try {
    return normalizeProviderBaseUrl(configured);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `${getProviderLabel(providerId)} base URL is invalid: ${error.message}`
        : `${getProviderLabel(providerId)} base URL is invalid.`,
    );
  }
}

async function getCandidateOpenRouterModels(settings: RuntimeAISettings, force = false) {
  const config = settings.providers.openrouter;
  const models = config.options?.freeOnly
    ? await fetchFreeOpenRouterModels(force)
    : await fetchOpenRouterModels(force);

  if (models.length === 0) {
    throw new Error("No OpenRouter models are currently available for this filter.");
  }

  return models;
}

function selectOpenRouterModel(
  settings: RuntimeAISettings,
  models: OpenRouterModelSummary[],
  mode: Exclude<SolveMode, "research">,
) {
  const config = settings.providers.openrouter;
  const configuredModel = mode === "deep" ? config.models.deepModel : config.models.fastModel;

  if (config.options?.freeOnly && !configuredModel) {
    return OPENROUTER_FREE_ROUTER_MODEL;
  }

  return chooseRecommendedOpenRouterModel(
    models,
    mode,
    configuredModel,
  );
}

function getConfiguredOpenAIModel(
  settings: RuntimeAISettings,
  providerId: ProviderId,
  mode: Exclude<SolveMode, "research">,
) {
  const config = settings.providers[providerId];
  const descriptor = getProviderDescriptor(providerId);

  return (
    (mode === "deep" ? config.models.deepModel : config.models.fastModel) ||
    (mode === "deep" ? descriptor.defaultModels.deepModel : descriptor.defaultModels.fastModel) ||
    ""
  );
}

export async function resolvePreferredOpenRouterModels(settings: RuntimeAISettings, force = false) {
  const models = await getCandidateOpenRouterModels(settings, force);
  return {
    models,
    fastModel: selectOpenRouterModel(settings, models, "fast"),
    deepModel: selectOpenRouterModel(settings, models, "deep"),
  };
}

export async function solveTextQuestionWithProvider(
  text: string,
  mode: Exclude<SolveMode, "research">,
  subject: string,
  detailed: boolean,
  settings: RuntimeAISettings,
  promptContext?: PromptRuntimeContext,
) {
  const providerId = getSelectedProviderId(settings);
  enforceFreeModeRateLimit(settings);

  if (providerId === "gemini") {
    const apiKey = requireProviderApiKey(settings, providerId);
    const response = await solveGeminiTextQuestion(
      text,
      mode,
      subject,
      detailed,
      apiKey,
      {
        preferredLocation: settings.preferredLocation,
        localDateTime: promptContext?.localDateTime,
        timeZone: promptContext?.timeZone,
      },
    );
    return {
      text: response.text,
      provider: providerId,
      model: response.model,
    };
  }

  if (providerId === "openrouter") {
    const apiKey = requireProviderApiKey(settings, providerId);
    const models = await getCandidateOpenRouterModels(settings);
    const model = selectOpenRouterModel(settings, models, mode);

    return {
      text: await solveTextQuestionWithOpenAICompatible({
        providerId,
        apiKey,
        baseUrl: requireOpenAICompatibleBaseUrl(settings, providerId),
        model,
        text,
        mode,
        subject,
        detailed,
        preferredLocation: settings.preferredLocation,
        localDateTime: promptContext?.localDateTime,
        timeZone: promptContext?.timeZone,
      }),
      provider: providerId,
      model,
    };
  }

  const apiKey = requireProviderApiKey(settings, providerId);
  const baseUrl = requireOpenAICompatibleBaseUrl(settings, providerId);
  const model = getConfiguredOpenAIModel(settings, providerId, mode);
  if (!model) {
    throw new Error(`Choose a ${mode} model for ${getProviderLabel(providerId)} in Setup first.`);
  }

  return {
    text: await solveTextQuestionWithOpenAICompatible({
      providerId,
      apiKey,
      baseUrl,
      model,
      text,
      mode,
      subject,
      detailed,
      preferredLocation: settings.preferredLocation,
      localDateTime: promptContext?.localDateTime,
      timeZone: promptContext?.timeZone,
    }),
    provider: providerId,
    model,
  };
}

export async function solveImageQuestionWithProvider(
  base64Image: string,
  mode: Exclude<SolveMode, "research">,
  subject: string,
  detailed: boolean,
  settings: RuntimeAISettings,
  promptContext?: PromptRuntimeContext,
) {
  const providerId = getSelectedProviderId(settings);
  enforceFreeModeRateLimit(settings);

  if (isSharedFreeMode(settings)) {
    throw new Error("Secure free mode supports text tutoring only. Add your own key for image solving.");
  }

  if (providerId === "gemini") {
    const apiKey = requireProviderApiKey(settings, providerId);
    const response = await solveGeminiImageQuestion(
      base64Image,
      mode,
      subject,
      detailed,
      apiKey,
      {
        preferredLocation: settings.preferredLocation,
        localDateTime: promptContext?.localDateTime,
        timeZone: promptContext?.timeZone,
      },
    );
    return {
      text: response.text,
      provider: providerId,
      model: response.model,
    };
  }

  if (providerId === "openrouter") {
    const apiKey = requireProviderApiKey(settings, providerId);
    const models = await getCandidateOpenRouterModels(settings);
    const model = selectOpenRouterModel(settings, models, mode);
    const selectedModel = models.find((candidate) => candidate.id === model);

    if (model !== OPENROUTER_FREE_ROUTER_MODEL && !selectedModel?.supportsImages) {
      throw new Error("The selected OpenRouter model is text-only. Choose an image-capable OpenRouter model.");
    }

    return {
      text: await solveImageQuestionWithOpenAICompatible({
        providerId,
        apiKey,
        baseUrl: requireOpenAICompatibleBaseUrl(settings, providerId),
        model,
        base64Image,
        mode,
        subject,
        detailed,
        preferredLocation: settings.preferredLocation,
        localDateTime: promptContext?.localDateTime,
        timeZone: promptContext?.timeZone,
      }),
      provider: providerId,
      model,
    };
  }

  if (providerId === "minimax") {
    throw new Error(getMiniMaxBrowserImageSupportMessage());
  }

  throw new Error("Custom OpenAI-compatible browser mode is configured for text and chat. Use Gemini or OpenRouter for direct browser image solves.");
}

export async function chatWithTutorWithProvider(
  history: { role: string; text: string }[],
  message: string,
  followUpContext: FollowUpContextPayload | undefined,
  settings: RuntimeAISettings,
  subject?: string,
  promptContext?: PromptRuntimeContext,
) {
  const providerId = getSelectedProviderId(settings);
  enforceFreeModeRateLimit(settings);

  if (providerId === "gemini") {
    const apiKey = requireProviderApiKey(settings, providerId);
    return chatWithGemini(history, message, followUpContext, apiKey, {
      preferredLocation: settings.preferredLocation,
      subject,
      localDateTime: promptContext?.localDateTime,
      timeZone: promptContext?.timeZone,
    });
  }

  if (providerId === "openrouter") {
    const apiKey = requireProviderApiKey(settings, providerId);
    const models = await getCandidateOpenRouterModels(settings);
    const model = selectOpenRouterModel(settings, models, "deep");
    return chatWithOpenAICompatible({
      providerId,
      apiKey,
      baseUrl: requireOpenAICompatibleBaseUrl(settings, providerId),
      model,
      history,
      message,
      followUpContext,
      preferredLocation: settings.preferredLocation,
      subject,
      localDateTime: promptContext?.localDateTime,
      timeZone: promptContext?.timeZone,
    });
  }

  const apiKey = requireProviderApiKey(settings, providerId);
  const baseUrl = requireOpenAICompatibleBaseUrl(settings, providerId);
  const model = getConfiguredOpenAIModel(settings, providerId, "deep");
  if (!model) {
    throw new Error(`Choose a deep model for ${getProviderLabel(providerId)} in Setup first.`);
  }

  return chatWithOpenAICompatible({
    providerId,
    apiKey,
    baseUrl,
    model,
    history,
    message,
    followUpContext,
    preferredLocation: settings.preferredLocation,
    subject,
    localDateTime: promptContext?.localDateTime,
    timeZone: promptContext?.timeZone,
  });
}

export async function transcribeAudioWithProvider(audioBlob: Blob, settings: RuntimeAISettings) {
  if (isSharedFreeMode(settings)) {
    throw new Error("Secure free mode does not include audio transcription. Add your own Gemini key.");
  }
  const providerId = getSelectedProviderId(settings);
  if (providerId !== "gemini") {
    throw new Error("Audio transcription is only available when Gemini is selected.");
  }

  const apiKey = requireProviderApiKey(settings, providerId);
  return transcribeWithGemini(audioBlob, apiKey);
}

export function isRuntimeProviderReady(settings: RuntimeAISettings) {
  const providerId = getSelectedProviderId(settings);
  const config = getSelectedProviderConfig(settings);
  const hasApiKey = Boolean(getProviderApiKey(settings, providerId));

  if (
    providerId === "openrouter" &&
    !config.apiKey?.trim() &&
    settings.freeModeEnabled &&
    settings.legalAcceptedAt &&
    OPENROUTER_SHARED_FREE_KEY
  ) {
    return true;
  }

  if (!hasApiKey) {
    return false;
  }

  if (getProviderDescriptor(providerId).kind === "openai_compatible") {
    try {
      return Boolean(normalizeProviderBaseUrl(getProviderBaseUrl(settings, providerId)));
    } catch {
      return false;
    }
  }

  return true;
}

export function getProviderReadinessLabel(settings: RuntimeAISettings) {
  const providerId = getSelectedProviderId(settings);
  const descriptor = getProviderDescriptor(providerId);
  const hasApiKey = Boolean(getProviderApiKey(settings, providerId));

  if (!hasApiKey) {
    if (
      providerId === "openrouter" &&
      settings.freeModeEnabled &&
      settings.legalAcceptedAt &&
      OPENROUTER_SHARED_FREE_KEY
    ) {
      return "OpenRouter free mode ready";
    }
    return `Add ${descriptor.label} key`;
  }

  if (descriptor.kind === "openai_compatible") {
    const configured = getProviderBaseUrl(settings, providerId);
    if (!configured) {
      return `Add ${descriptor.label} base URL`;
    }
    try {
      normalizeProviderBaseUrl(configured);
    } catch {
      return `Fix ${descriptor.label} base URL`;
    }
  }

  return `${descriptor.label} ready`;
}

export function validateOpenRouterSelection(
  settings: RuntimeAISettings,
  modelId: string,
  models: OpenRouterModelSummary[],
) {
  if (!settings.providers.openrouter.options?.freeOnly) {
    return true;
  }

  const model = models.find((entry) => entry.id === modelId);
  return Boolean(model && isFreeOpenRouterModel(model));
}
