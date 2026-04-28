import { createStandardFetcher } from "./_standard";

const BASE = "https://api.sambanova.ai/v1";

export const fetchSambaNovaCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "SambaNova",
  ttlMs: 5 * 60 * 1000,
});
