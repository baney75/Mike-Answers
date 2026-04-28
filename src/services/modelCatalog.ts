import type { ModelCatalogEntry } from "../types";

/**
 * Heuristic: a model likely supports images if its ID contains these patterns.
 * Used when the catalog response does not explicitly include modality info.
 */
const VISION_MODEL_PATTERNS = [
  /vl/i,
  /vision/i,
  /multimodal/i,
  /image/i,
  /4o/i,
  /omini/i,
];

function guessSupportsImages(modelId: string): boolean {
  return VISION_MODEL_PATTERNS.some((pattern) => pattern.test(modelId));
}

/**
 * Parse the standard OpenAI-compatible /v1/models response data array
 * into normalized ModelCatalogEntry[].
 *
 * Standard format: { object: "list", data: [{ id, object: "model", created, owned_by }] }
 * Some providers enrich entries with { context_length, pricing, architecture: { input_modalities } }.
 *
 * This is a pure parser — no fetching, no auth, no I/O.
 */
export function parseModelListResponse(data: unknown[]): ModelCatalogEntry[] {
  return data
    .map((entry: unknown): ModelCatalogEntry | null => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Record<string, unknown>;
      const id = typeof raw.id === "string" ? raw.id.trim() : "";
      if (!id) return null;

      const name = typeof raw.name === "string" ? raw.name : id;
      const description = typeof raw.description === "string" ? raw.description : undefined;
      const contextLength =
        typeof raw.context_length === "number"
          ? raw.context_length
          : typeof raw.max_tokens === "number"
            ? raw.max_tokens
            : 0;

      // Determine image support from architecture.input_modalities if available
      let supportsImages = false;
      const architecture = raw.architecture as Record<string, unknown> | undefined;
      const inputModalities = architecture?.input_modalities;
      if (Array.isArray(inputModalities)) {
        supportsImages = inputModalities.some(
          (m) => typeof m === "string" && (m.toLowerCase() === "image" || m.toLowerCase() === "vision"),
        );
      }
      if (!supportsImages) {
        supportsImages = guessSupportsImages(id);
      }

      // Determine if the model is free
      let free = false;
      const pricing = raw.pricing as Record<string, unknown> | undefined;
      if (pricing) {
        const prompt = pricing.prompt;
        const completion = pricing.completion;
        free = prompt === 0 || prompt === "0" || (typeof prompt === "string" && prompt === "0");
        if (!free) {
          free = completion === 0 || completion === "0" || (typeof completion === "string" && completion === "0");
        }
      }
      if (!free && id.endsWith(":free")) {
        free = true;
      }

      return { id, name, description, contextLength, supportsImages, free };
    })
    .filter((entry): entry is ModelCatalogEntry => entry !== null);
}

/**
 * Sort model catalog entries: free models first, then by context length descending.
 */
export function sortModelCatalog(entries: ModelCatalogEntry[]): ModelCatalogEntry[] {
  return [...entries].sort((a, b) => {
    if (a.free !== b.free) return a.free ? -1 : 1;
    return b.contextLength - a.contextLength;
  });
}
