import { createStandardFetcher } from "./_standard";

const BASE = "https://api.openai.com/v1";

export const fetchOpenAICatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "OpenAI",
  ttlMs: 5 * 60 * 1000,
});
