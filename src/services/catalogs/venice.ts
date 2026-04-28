import type { ModelCatalogEntry } from "../../types";
import { parseModelListResponse, sortModelCatalog } from "../modelCatalog";

const VENICE_V1 = "https://api.venice.ai/api/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { expiresAt: number; items: ModelCatalogEntry[] } | null = null;

/**
 * Fetch live models from Venice.ai's API.
 * Venice allows model listing without API key auth.
 */
export async function fetchVeniceCatalog(
  apiKey?: string,
  force = false,
): Promise<ModelCatalogEntry[]> {
  if (!force && cache && cache.expiresAt > Date.now()) {
    return cache.items;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(`${VENICE_V1}/models`, { headers });
  if (!response.ok) {
    throw new Error(`Venice catalog failed (${response.status}).`);
  }

  const payload = (await response.json()) as { data?: unknown[] };
  if (!Array.isArray(payload.data)) {
    throw new Error("Unexpected Venice catalog format.");
  }

  const items = sortModelCatalog(parseModelListResponse(payload.data));
  cache = { items, expiresAt: Date.now() + CACHE_TTL_MS };
  return items;
}
