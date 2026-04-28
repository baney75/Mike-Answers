import { createStandardFetcher } from "./_standard";

const BASE = "https://api.deepinfra.com/v1/openai";

export const fetchDeepInfraCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "DeepInfra",
  ttlMs: 5 * 60 * 1000,
});
