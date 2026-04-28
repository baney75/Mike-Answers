import { createStandardFetcher } from "./_standard";

const BASE = "https://api.fireworks.ai/inference/v1";

export const fetchFireworksCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "Fireworks AI",
  ttlMs: 5 * 60 * 1000,
});
