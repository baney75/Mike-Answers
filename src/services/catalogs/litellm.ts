import { createStandardFetcher } from "./_standard";

const BASE = "http://localhost:4000/v1";

export const fetchLiteLLMCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "LiteLLM",
  ttlMs: 5 * 60 * 1000,
});
