import type { ModelCatalogEntry } from "../../types";
import { parseModelListResponse, sortModelCatalog } from "../modelCatalog";
import { fetchJson } from "../../utils/fetch";

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

  let payload: { data?: unknown[] };
  try {
    payload = await fetchJson<{ data?: unknown[] }>(`${LM_STUDIO_V1}/models`, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : "";
    if (message.includes("401") || message.includes("403") || message.includes("denied")) {
      throw new Error("LM Studio catalog access denied. Check your server auth settings.");
    }
    if (message.includes("timeout") || message.includes("refused")) {
      throw new Error("LM Studio server is not reachable. Make sure it is running on localhost:1234.");
    }
    throw new Error(`LM Studio catalog is not reachable (${message}).`);
  }

  if (!Array.isArray(payload.data)) {
    throw new Error("Unexpected LM Studio catalog format.");
  }

  const items = sortModelCatalog(parseModelListResponse(payload.data));
  cache = { items, expiresAt: Date.now() + CACHE_TTL_MS };
  return items;
}
