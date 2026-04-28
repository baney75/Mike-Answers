import { createStandardFetcher } from "./_standard";

const BASE = "https://api.cerebras.ai/v1";

export const fetchCerebrasCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "Cerebras",
  ttlMs: 5 * 60 * 1000,
});
