import { useCallback, useEffect, useState } from "react";

import type { ModelCatalogEntry, RuntimeAISettings } from "../types";
import { resolvePreferredOpenRouterModels } from "../services/ai";
import { getProviderDescriptor, getSelectedOpenAICompatiblePreset } from "../services/providers/registry";

import { fetchOpenAICatalog } from "../services/catalogs/openai";
import { fetchDeepSeekCatalog } from "../services/catalogs/deepseek";
import { fetchGroqCatalog } from "../services/catalogs/groq";
import { fetchTogetherCatalog } from "../services/catalogs/together";
import { fetchFireworksCatalog } from "../services/catalogs/fireworks";
import { fetchMistralCatalog } from "../services/catalogs/mistral";
import { fetchXAICatalog } from "../services/catalogs/xai";
import { fetchCerebrasCatalog } from "../services/catalogs/cerebras";
import { fetchSambaNovaCatalog } from "../services/catalogs/sambanova";
import { fetchDeepInfraCatalog } from "../services/catalogs/deepinfra";
import { fetchCohereCatalog } from "../services/catalogs/cohere";
import { fetchHyperbolicCatalog } from "../services/catalogs/hyperbolic";
import { fetchHuggingFaceCatalog } from "../services/catalogs/huggingface";
import { fetchNvidiaNimCatalog } from "../services/catalogs/nvidiaNim";
import { fetchNovitaCatalog } from "../services/catalogs/novita";
import { fetchSiliconFlowCatalog } from "../services/catalogs/siliconflow";
import { fetchVeniceCatalog } from "../services/catalogs/venice";
import { fetchLMStudioCatalog } from "../services/catalogs/lmstudio";
import { fetchLocalOllamaCatalog } from "../services/catalogs/localOllama";
import { fetchLiteLLMCatalog } from "../services/catalogs/litellm";

function getEffectiveCapabilities(settings: RuntimeAISettings) {
  const providerId = settings.selectedProviderId;
  if (providerId === "openai_compatible") {
    return getSelectedOpenAICompatiblePreset(settings.providers.openai_compatible).capabilities;
  }
  return getProviderDescriptor(providerId).capabilities;
}

/**
 * Route to the correct per-provider catalog fetcher based on provider ID/preset ID.
 * Each case is explicit — no generic fallback.
 */
async function fetchModelsForProvider(
  settings: RuntimeAISettings,
  force: boolean,
): Promise<ModelCatalogEntry[]> {
  const providerId = settings.selectedProviderId;

  // OpenRouter has its own complex fetcher with recommendation logic
  if (providerId === "openrouter") {
    const catalog = await resolvePreferredOpenRouterModels(settings, force);
    return catalog.models;
  }

  const apiKey = settings.providers[providerId]?.apiKey?.trim() ?? "";

  // For preset-based providers (openai_compatible), route by preset id
  if (providerId === "openai_compatible") {
    const presetId = settings.providers.openai_compatible.options?.presetId;
    return fetchForPreset(presetId, apiKey, force);
  }

  // For direct provider IDs
  return fetchForPreset(providerId, apiKey, force);
}

async function fetchForPreset(
  presetId: string | undefined,
  apiKey: string,
  force: boolean,
): Promise<ModelCatalogEntry[]> {
  switch (presetId) {
    case "openai":
      return fetchOpenAICatalog(apiKey, force);
    case "deepseek":
      return fetchDeepSeekCatalog(apiKey, force);
    case "groq":
      return fetchGroqCatalog(apiKey, force);
    case "together":
      return fetchTogetherCatalog(apiKey, force);
    case "fireworks":
      return fetchFireworksCatalog(apiKey, force);
    case "mistral":
      return fetchMistralCatalog(apiKey, force);
    case "xai":
      return fetchXAICatalog(apiKey, force);
    case "cerebras":
      return fetchCerebrasCatalog(apiKey, force);
    case "sambanova":
      return fetchSambaNovaCatalog(apiKey, force);
    case "deepinfra":
      return fetchDeepInfraCatalog(apiKey, force);
    case "cohere":
      return fetchCohereCatalog(apiKey, force);
    case "hyperbolic":
      return fetchHyperbolicCatalog(apiKey, force);
    case "huggingface":
      return fetchHuggingFaceCatalog(apiKey, force);
    case "nvidia-nim":
      return fetchNvidiaNimCatalog(apiKey, force);
    case "novita":
      return fetchNovitaCatalog(apiKey, force);
    case "siliconflow":
      return fetchSiliconFlowCatalog(apiKey, force);
    case "venice":
      return fetchVeniceCatalog(apiKey, force);
    case "lmstudio":
      return fetchLMStudioCatalog(apiKey, force);
    case "ollama":
      return fetchLocalOllamaCatalog(apiKey, force);
    case "litellm":
      return fetchLiteLLMCatalog(apiKey, force);
    // Providers without a live model catalog endpoint
    case "anthropic":
    case "perplexity":
    case "vercel-ai-gateway":
    case "cloudflare-ai-gateway":
    case "vertex-ai":
    case "bedrock":
    case "azure-openai":
      return [];
    default:
      return [];
  }
}

export function useProviderCatalog(settings: RuntimeAISettings) {
  const [models, setModels] = useState<ModelCatalogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    const caps = getEffectiveCapabilities(settings);
    if (!caps.supportsModelCatalog) {
      setModels([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = await fetchModelsForProvider(settings, force);
      setModels(items);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load models.");
    } finally {
      setLoading(false);
    }
  }, [
    settings.selectedProviderId,
    // OpenRouter-specific settings that affect the catalog
    settings.providers.openrouter?.models?.deepModel,
    settings.providers.openrouter?.models?.fastModel,
    settings.providers.openrouter?.options?.freeOnly,
    // Re-fetch when the openai_compatible preset changes
    settings.providers.openai_compatible?.options?.presetId,
  ]);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  return {
    models,
    loading,
    error,
    refresh,
  };
}
