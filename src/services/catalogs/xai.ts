import { createStandardFetcher } from "./_standard";

const BASE = "https://api.x.ai/v1";

export const fetchXAICatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "xAI",
  ttlMs: 5 * 60 * 1000,
});
