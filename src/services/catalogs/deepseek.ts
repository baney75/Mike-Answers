import { createStandardFetcher } from "./_standard";

const BASE = "https://api.deepseek.com/v1";

export const fetchDeepSeekCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "DeepSeek",
  ttlMs: 5 * 60 * 1000,
});
