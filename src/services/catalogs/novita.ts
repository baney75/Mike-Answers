import { createStandardFetcher } from "./_standard";

const BASE = "https://api.novita.ai/v3/openai";

export const fetchNovitaCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "Novita AI",
  ttlMs: 5 * 60 * 1000,
});
