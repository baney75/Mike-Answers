import { createStandardFetcher } from "./_standard";

const BASE = "https://api.hyperbolic.xyz/v1";

export const fetchHyperbolicCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "Hyperbolic",
  ttlMs: 5 * 60 * 1000,
});
