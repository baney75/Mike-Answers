import type { ModelCatalogEntry } from "../../types";
import { parseModelListResponse, sortModelCatalog } from "../modelCatalog";
import { enrichOllamaCloudModels } from "../ollamaCloud";

const OLLAMA_CLOUD_V1 = "https://ollama.com/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { expiresAt: number; items: ModelCatalogEntry[] } | null = null;

/**
 * Fetch live models from Ollama Cloud's OpenAI-compatible /v1/models endpoint,
 * then enrich with native /api/tags for family/parameter details.
 */
export async function fetchOllamaCloudCatalog(
  apiKey: string,
  force = false,
): Promise<ModelCatalogEntry[]> {
  if (!force && cache && cache.expiresAt > Date.now()) {
    return cache.items;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(`${OLLAMA_CLOUD_V1}/models`, { headers });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Ollama Cloud catalog access denied. Check your API key.");
    }
    throw new Error(`Ollama Cloud catalog failed (${response.status}).`);
  }

  const payload = (await response.json()) as { data?: unknown[] };
  if (!Array.isArray(payload.data)) {
    throw new Error("Unexpected Ollama Cloud catalog format.");
  }

  let items = parseModelListResponse(payload.data);

  // Enrich with native API metadata
  items = await enrichOllamaCloudModels(items, apiKey);
  items = sortModelCatalog(items);

  cache = { items, expiresAt: Date.now() + CACHE_TTL_MS };
  return items;
}
