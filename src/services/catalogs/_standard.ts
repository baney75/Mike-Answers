import type { ModelCatalogEntry } from "../../types";
import { parseModelListResponse, sortModelCatalog } from "../modelCatalog";

/**
 * Factory for standard OpenAI-compatible /v1/models catalog fetchers.
 *
 * Each call creates a completely independent function with its own cache,
 * its own hardcoded base URL, and its own error label. The factory is
 * purely a boilerplate eliminator — every generated function is explicit,
 * independently cached, and independently testable.
 *
 * NOT a shared generic fetcher. Each provider file explicitly calls this
 * factory and exports its own named function.
 */
export function createStandardFetcher(config: {
  baseUrl: string;
  label: string;
  ttlMs: number;
}): (apiKey: string, force?: boolean) => Promise<ModelCatalogEntry[]> {
  const { baseUrl, label, ttlMs } = config;
  let cache: { expiresAt: number; items: ModelCatalogEntry[] } | null = null;

  return async function fetchCatalog(apiKey: string, force = false): Promise<ModelCatalogEntry[]> {
    if (!force && cache && cache.expiresAt > Date.now()) {
      return cache.items;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const trimmedKey = apiKey.trim();
    if (trimmedKey) {
      headers.Authorization = `Bearer ${trimmedKey}`;
    }

    const response = await globalThis.fetch(`${baseUrl}/models`, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`${label} catalog access denied. Check your API key.`);
      }
      throw new Error(`${label} catalog failed (${response.status}).`);
    }

    const payload = (await response.json()) as { data?: unknown[] };
    if (!Array.isArray(payload.data)) {
      throw new Error(`Unexpected ${label} catalog format.`);
    }

    const items = sortModelCatalog(parseModelListResponse(payload.data));
    cache = { items, expiresAt: Date.now() + ttlMs };
    return items;
  };
}
