import { createStandardFetcher } from "./_standard";

const BASE = "https://api.groq.com/openai/v1";

export const fetchGroqCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "Groq",
  ttlMs: 5 * 60 * 1000,
});
