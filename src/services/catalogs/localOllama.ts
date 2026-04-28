import type { ModelCatalogEntry } from "../../types";
import { parseModelListResponse, sortModelCatalog } from "../modelCatalog";

const LOCAL_OLLAMA_V1 = "http://localhost:11434/v1";
const CACHE_TTL_MS = 30 * 1000; // 30 seconds — local models change frequently

let cache: { expiresAt: number; items: ModelCatalogEntry[] } | null = null;

/**
 * Fetch models from a local Ollama server's OpenAI-compatible /v1/models endpoint.
 * No API key required for local access.
 */
export async function fetchLocalOllamaCatalog(
  _apiKey?: string,
  force = false,
): Promise<ModelCatalogEntry[]> {
  if (!force && cache && cache.expiresAt > Date.now()) {
    return cache.items;
  }

  const response = await globalThis.fetch(`${LOCAL_OLLAMA_V1}/models`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Local Ollama catalog access denied. Check your server auth settings.");
    }
    // Fetch error / connection refused = server not running
    throw new Error("Local Ollama server is not reachable. Make sure Ollama is running on localhost:11434.");
  }

  const payload = (await response.json()) as { data?: unknown[] };
  if (!Array.isArray(payload.data)) {
    throw new Error("Unexpected local Ollama catalog format.");
  }

  const items = sortModelCatalog(parseModelListResponse(payload.data));
  cache = { items, expiresAt: Date.now() + CACHE_TTL_MS };
  return items;
}
