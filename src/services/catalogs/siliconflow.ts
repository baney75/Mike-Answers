import { createStandardFetcher } from "./_standard";

const BASE = "https://api.siliconflow.cn/v1";

export const fetchSiliconFlowCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "SiliconFlow",
  ttlMs: 5 * 60 * 1000,
});
