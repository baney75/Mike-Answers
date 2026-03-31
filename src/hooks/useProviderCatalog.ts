import { useCallback, useEffect, useState } from "react";

import type { OpenRouterModelSummary, RuntimeAISettings } from "../types";
import { resolvePreferredOpenRouterModels } from "../services/ai";

export function useProviderCatalog(settings: RuntimeAISettings) {
  const [models, setModels] = useState<OpenRouterModelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (settings.selectedProviderId !== "openrouter") {
      setModels([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const catalog = await resolvePreferredOpenRouterModels(settings, force);
      setModels(catalog.models);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load OpenRouter models.");
    } finally {
      setLoading(false);
    }
  }, [
    settings.selectedProviderId,
    settings.providers.openrouter.models.deepModel,
    settings.providers.openrouter.models.fastModel,
    settings.providers.openrouter.options?.freeOnly,
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
