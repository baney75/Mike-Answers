import { createStandardFetcher } from "./_standard";

const BASE = "https://api.mistral.ai/v1";

export const fetchMistralCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "Mistral",
  ttlMs: 5 * 60 * 1000,
});
