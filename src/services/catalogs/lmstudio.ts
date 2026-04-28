import type { ModelCatalogEntry } from "../../types";
import { parseModelListResponse, sortModelCatalog } from "../modelCatalog";

const LM_STUDIO_V1 = "http://localhost:1234/v1";
const CACHE_TTL_MS = 30 * 1000; // 30 seconds — local models change frequently

let cache: { expiresAt: number; items: ModelCatalogEntry[] } | null = null;

/**
 * Fetch models from a local LM Studio server's OpenAI-compatible /v1/models endpoint.
 * No API key required for local access.
 */
export async function fetchLMStudioCatalog(
  _apiKey?: string,
  force = false,
): Promise<ModelCatalogEntry[]> {
  if (!force && cache && cache.expiresAt > Date.now()) {
    return cache.items;
  }

  const response = await globalThis.fetch(`${LM_STUDIO_V1}/models`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("LM Studio catalog access denied. Check your server auth settings.");
    }
    // 502/connection refused = server not running
    if (response.type === "opaque" || response.status === 0) {
      throw new Error("LM Studio server is not reachable. Make sure it is running on localhost:1234.");
    }
    throw new Error(`LM Studio catalog failed (${response.status}).`);
  }

  const payload = (await response.json()) as { data?: unknown[] };
  if (!Array.isArray(payload.data)) {
    throw new Error("Unexpected LM Studio catalog format.");
  }

  const items = sortModelCatalog(parseModelListResponse(payload.data));
  cache = { items, expiresAt: Date.now() + CACHE_TTL_MS };
  return items;
}
