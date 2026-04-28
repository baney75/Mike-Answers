import { createStandardFetcher } from "./_standard";

const BASE = "https://integrate.api.nvidia.com/v1";

export const fetchNvidiaNimCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "NVIDIA NIM",
  ttlMs: 5 * 60 * 1000,
});
