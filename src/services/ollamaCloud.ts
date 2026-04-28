import type { ModelCatalogEntry } from "../types";

/**
 * Ollama Cloud native API base URL.
 * The native API at https://ollama.com/api/tags returns richer model metadata
 * (family, parameter_size, quantization_level) than the OpenAI-compatible
 * /v1/models endpoint.
 */
const OLLAMA_NATIVE_BASE = "https://ollama.com";

/**
 * In-memory cache for Ollama model detail responses.
 */
let detailCache: {
  expiresAt: number;
  items: Map<string, { family: string; parameterSize: string; supportsImages: boolean }>;
} | null = null;
const DETAIL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface OllamaTagModel {
  name: string;
  model: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaTagsResponse {
  models?: OllamaTagModel[];
}

/**
 * Cloud-capable model names known to include vision support.
 * Derived from the Ollama Cloud library (ollama.com/search?c=cloud)
 * and cross-referenced with the actual GET /v1/models response.
 * This is used as a heuristic when the native /api/tags endpoint
 * doesn't return modality information.
 */
const OLLAMA_CLOUD_VISION_MODELS = new Set([
  // Confirmed vision-capable from ollama.com library labels
  "kimi-k2.6",
  "kimi-k2.5",
  "kimi-k2-thinking",
  "qwen3.5:397b",
  "qwen3-vl:235b",
  "qwen3-vl:235b-instruct",
  "gemini-3-flash-preview",
  "gemma4:31b",
  "gemma3:27b",
  "gemma3:12b",
  "gemma3:4b",
  "ministral-3:8b",
  "ministral-3:14b",
  "devstral-small-2:24b",
  "mistral-large-3:675b",
  "rnj-1:8b",
]);

/**
 * Fetch model details from Ollama's native /api/tags endpoint.
 * Provides richer capability data than the basic v1/models catalog.
 *
 * @param apiKey - Ollama Cloud API key.
 * @returns A map of model ID to detail info (family, parameterSize, supportsImages).
 */
export async function fetchOllamaCloudModelDetails(
  apiKey: string,
): Promise<Map<string, { family: string; parameterSize: string; supportsImages: boolean }>> {
  if (detailCache && detailCache.expiresAt > Date.now()) {
    return detailCache.items;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const result = new Map<string, { family: string; parameterSize: string; supportsImages: boolean }>();

  try {
    const response = await fetch(`${OLLAMA_NATIVE_BASE}/api/tags`, { headers });

    if (!response.ok) {
      // Non-critical — just return empty details
      return result;
    }

    const payload = (await response.json()) as OllamaTagsResponse;
    const models = payload.models ?? [];

    for (const model of models) {
      const modelId = model.model || model.name;
      if (!modelId) continue;

      const details = model.details;
      result.set(modelId, {
        family: details?.family ?? "",
        parameterSize: details?.parameter_size ?? "",
        supportsImages: OLLAMA_CLOUD_VISION_MODELS.has(modelId),
      });
    }

    detailCache = {
      items: result,
      expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
    };
  } catch {
    // Non-critical — return empty map on fetch failure
  }

  return result;
}

/**
 * Enrich a fetched list of Ollama Cloud models with detail information
 * from the native /api/tags endpoint.
 *
 * @param models - Raw model list from fetchOpenAICompatibleModels
 * @param apiKey - Ollama Cloud API key
 * @returns Enhanced model entries with better names, descriptions, and image support flags
 */
export async function enrichOllamaCloudModels(
  models: ModelCatalogEntry[],
  apiKey: string,
): Promise<ModelCatalogEntry[]> {
  const details = await fetchOllamaCloudModelDetails(apiKey);

  return models.map((model) => {
    const detail = details.get(model.id);
    if (!detail) return model;

    // Build a more descriptive name from the detail info
    const paramInfo = detail.parameterSize ? ` (${detail.parameterSize})` : "";
    const familyInfo = detail.family ? detail.family : "";

    return {
      ...model,
      name: familyInfo
        ? `${familyInfo} ${model.id}${paramInfo}`
        : `${model.id}${paramInfo}`,
      description: detail.family
        ? `Family: ${detail.family}${detail.parameterSize ? `, ${detail.parameterSize} params` : ""}`
        : model.description,
      supportsImages: model.supportsImages || detail.supportsImages,
    };
  });
}
