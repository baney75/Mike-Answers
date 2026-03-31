import type {
  OpenRouterModelSummary,
  ProviderId,
  RuntimeAISettings,
  SolveMode,
} from "../types";
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

  return config.apiKey?.trim() ?? "";
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
  const baseUrl = getProviderBaseUrl(settings, providerId);
  if (!baseUrl) {
    throw new Error(`Add a base URL for ${getProviderLabel(providerId)} in Setup before using it.`);
  }

  return baseUrl;
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
  return chooseRecommendedOpenRouterModel(
    models,
    mode,
    mode === "deep" ? config.models.deepModel : config.models.fastModel,
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
) {
  const providerId = getSelectedProviderId(settings);

  if (providerId === "gemini") {
    const apiKey = requireProviderApiKey(settings, providerId);
    const response = await solveGeminiTextQuestion(
      text,
      mode,
      subject,
      detailed,
      apiKey,
    );
    return {
      text: response,
      provider: providerId,
      model: mode === "deep"
        ? settings.providers.gemini.models.deepModel || "gemini-2.5-pro"
        : settings.providers.gemini.models.fastModel || "gemini-2.5-flash-lite",
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
) {
  const providerId = getSelectedProviderId(settings);

  if (providerId === "gemini") {
    const apiKey = requireProviderApiKey(settings, providerId);
    const response = await solveGeminiImageQuestion(base64Image, mode, subject, detailed, apiKey);
    return {
      text: response,
      provider: providerId,
      model: mode === "deep"
        ? settings.providers.gemini.models.deepModel || "gemini-2.5-pro"
        : settings.providers.gemini.models.fastModel || "gemini-2.5-flash-lite",
    };
  }

  if (providerId === "openrouter") {
    const apiKey = requireProviderApiKey(settings, providerId);
    const models = await getCandidateOpenRouterModels(settings);
    const model = selectOpenRouterModel(settings, models, mode);
    const selectedModel = models.find((candidate) => candidate.id === model);

    if (!selectedModel?.supportsImages) {
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
  originalQuestion: { text?: string; imageBase64?: string } | undefined,
  settings: RuntimeAISettings,
) {
  const providerId = getSelectedProviderId(settings);

  if (providerId === "gemini") {
    const apiKey = requireProviderApiKey(settings, providerId);
    return chatWithGemini(history, message, originalQuestion, apiKey);
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
      originalQuestion,
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
    originalQuestion,
  });
}

export async function transcribeAudioWithProvider(audioBlob: Blob, settings: RuntimeAISettings) {
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

  if (!hasApiKey) {
    return false;
  }

  if (getProviderDescriptor(providerId).kind === "openai_compatible") {
    return Boolean(getProviderBaseUrl(settings, providerId));
  }

  return true;
}

export function getProviderReadinessLabel(settings: RuntimeAISettings) {
  const providerId = getSelectedProviderId(settings);
  const descriptor = getProviderDescriptor(providerId);
  const hasApiKey = Boolean(getProviderApiKey(settings, providerId));

  if (!hasApiKey) {
    return `Add ${descriptor.label} key`;
  }

  if (descriptor.kind === "openai_compatible" && !getProviderBaseUrl(settings, providerId)) {
    return `Add ${descriptor.label} base URL`;
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
