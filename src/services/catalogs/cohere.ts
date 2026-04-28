import { createStandardFetcher } from "./_standard";

const BASE = "https://api.cohere.ai/compatibility/v1";

export const fetchCohereCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "Cohere",
  ttlMs: 5 * 60 * 1000,
});
