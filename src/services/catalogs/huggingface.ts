import { createStandardFetcher } from "./_standard";

const BASE = "https://router.huggingface.co/hf-inference/v1";

export const fetchHuggingFaceCatalog = createStandardFetcher({
  baseUrl: BASE,
  label: "Hugging Face",
  ttlMs: 5 * 60 * 1000,
});
