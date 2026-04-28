import { createStandardFetcher } from "./_standard";

const BASE = "https://api.together.xyz/v1";

export const fetchTogetherCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "Together AI",
  ttlMs: 5 * 60 * 1000,
});
