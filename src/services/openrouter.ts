import type { OpenRouterModelSummary, SolveMode } from "../types";
import {
  chatWithOpenAICompatible,
  solveImageQuestionWithOpenAICompatible,
  solveTextQuestionWithOpenAICompatible,
} from "./openaiCompatible";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODELS_CACHE_MS = 1000 * 60 * 15;
const MODEL_RECOMMENDATIONS = {
  fast: [
    "qwen/qwen3.6-plus-preview:free",
    "google/gemma-3-27b-it:free",
    "deepseek/deepseek-r1-0528-qwen3-8b:free",
  ],
  deep: [
    "qwen/qwen3.6-plus-preview:free",
    "deepseek/deepseek-r1-0528-qwen3-8b:free",
    "google/gemma-3-27b-it:free",
  ],
} as const;

interface OpenRouterModelResponse {
  data?: Array<{
    id?: string;
    name?: string;
    description?: string;
    context_length?: number;
    architecture?: {
      input_modalities?: string[];
    };
    pricing?: {
      prompt?: string;
      completion?: string;
    };
  }>;
}

let cachedModels:
  | {
      expiresAt: number;
      items: OpenRouterModelSummary[];
    }
  | null = null;

function isFreeModelId(modelId: string) {
  return modelId.endsWith(":free");
}

export function isFreeOpenRouterModel(model: OpenRouterModelSummary) {
  return model.free || isFreeModelId(model.id);
}

export async function fetchOpenRouterModels(force = false) {
  if (!force && cachedModels && cachedModels.expiresAt > Date.now()) {
    return cachedModels.items;
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error(`Unable to load OpenRouter models (${response.status}).`);
  }

  const payload = (await response.json()) as OpenRouterModelResponse;
  const items = (payload.data ?? [])
    .map((model): OpenRouterModelSummary | null => {
      if (!model.id) {
        return null;
      }

      const inputModalities = model.architecture?.input_modalities ?? ["text"];
      const free =
        isFreeModelId(model.id) ||
        (model.pricing?.prompt === "0" && model.pricing?.completion === "0");

      return {
        id: model.id,
        name: model.name ?? model.id,
        description: model.description,
        contextLength: model.context_length ?? 0,
        inputModalities,
        supportsImages: inputModalities.includes("image"),
        free,
      };
    })
    .filter((model): model is OpenRouterModelSummary => Boolean(model))
    .sort((left, right) => {
      if (left.free !== right.free) {
        return left.free ? -1 : 1;
      }
      return right.contextLength - left.contextLength;
    });

  cachedModels = {
    items,
    expiresAt: Date.now() + MODELS_CACHE_MS,
  };

  return items;
}

export async function fetchFreeOpenRouterModels(force = false) {
  const models = await fetchOpenRouterModels(force);
  return models.filter(isFreeOpenRouterModel);
}

export function chooseRecommendedOpenRouterModel(
  models: OpenRouterModelSummary[],
  mode: Exclude<SolveMode, "research">,
  preferredModel?: string,
) {
  if (preferredModel && models.some((model) => model.id === preferredModel)) {
    return preferredModel;
  }

  const recommendations = MODEL_RECOMMENDATIONS[mode];
  for (const candidate of recommendations) {
    if (models.some((model) => model.id === candidate)) {
      return candidate;
    }
  }

  return models[0]?.id ?? "";
}

export async function solveTextQuestionWithOpenRouter(options: {
  apiKey: string;
  model: string;
  text: string;
  mode: Exclude<SolveMode, "research">;
  subject?: string;
  detailed?: boolean;
}) {
  const { apiKey, model, text, mode, subject = "Auto-detect", detailed = false } = options;
  return solveTextQuestionWithOpenAICompatible({
    providerId: "openrouter",
    apiKey,
    baseUrl: OPENROUTER_BASE_URL,
    model,
    text,
    mode,
    subject,
    detailed,
  });
}

export async function solveImageQuestionWithOpenRouter(options: {
  apiKey: string;
  model: string;
  base64Image: string;
  mode: Exclude<SolveMode, "research">;
  subject?: string;
  detailed?: boolean;
}) {
  const { apiKey, model, base64Image, mode, subject = "Auto-detect", detailed = false } = options;
  return solveImageQuestionWithOpenAICompatible({
    providerId: "openrouter",
    apiKey,
    baseUrl: OPENROUTER_BASE_URL,
    model,
    base64Image,
    mode,
    subject,
    detailed,
  });
}

export async function chatWithOpenRouter(options: {
  apiKey: string;
  model: string;
  history: { role: string; text: string }[];
  message: string;
  originalQuestion?: { text?: string; imageBase64?: string };
}) {
  const { apiKey, model, history, message, originalQuestion } = options;
  return chatWithOpenAICompatible({
    providerId: "openrouter",
    apiKey,
    baseUrl: OPENROUTER_BASE_URL,
    model,
    history,
    message,
    originalQuestion,
  });
}
