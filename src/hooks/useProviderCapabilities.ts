import { useMemo, useCallback } from "react";
import type { ProviderId, ProviderDescriptor, ProviderRuntimeConfig } from "../types";
import { getProviderDescriptor } from "../services/providers/registry";
import { useAISettings } from "./useAISettings";

/**
 * Custom hook for centralized provider capability validation
 * Replaces scattered capability checks throughout the codebase
 */
export function useProviderCapabilities() {
  const { settings } = useAISettings();
  const providers = settings.providers;

  const getDescriptor = useCallback((providerId: ProviderId): ProviderDescriptor | null => {
    return getProviderDescriptor(providerId);
  }, []);

  const getCapabilities = useCallback((providerId: ProviderId) => {
    const descriptor = getDescriptor(providerId);
    if (!descriptor) {
      return {
        supportsGrounding: false,
        supportsImageInputInBrowser: false,
        supportsAudioTranscription: false,
        supportsCustomBaseUrl: false,
        supportsModelCatalog: false,
        requiresApiKey: true,
      };
    }
    return descriptor.capabilities;
  }, [getDescriptor]);

  const canSolveImage = useCallback((providerId: ProviderId): boolean => {
    const caps = getCapabilities(providerId);
    return caps.supportsImageInputInBrowser;
  }, [getCapabilities]);

  const canTranscribeAudio = useCallback((providerId: ProviderId): boolean => {
    const caps = getCapabilities(providerId);
    return caps.supportsAudioTranscription;
  }, [getCapabilities]);

  const canUseGrounding = useCallback((providerId: ProviderId): boolean => {
    const caps = getCapabilities(providerId);
    return caps.supportsGrounding;
  }, [getCapabilities]);

  const canUseCustomBaseUrl = useCallback((providerId: ProviderId): boolean => {
    const caps = getCapabilities(providerId);
    return caps.supportsCustomBaseUrl;
  }, [getCapabilities]);

  const canLoadModelCatalog = useCallback((providerId: ProviderId): boolean => {
    const caps = getCapabilities(providerId);
    return caps.supportsModelCatalog;
  }, [getCapabilities]);

  const getProviderConfig = useCallback((providerId: ProviderId): ProviderRuntimeConfig | null => {
    return providers[providerId] || null;
  }, [providers]);

  const validateProviderReady = useCallback((providerId: ProviderId): { ready: boolean; reason?: string } => {
    const descriptor = getDescriptor(providerId);
    if (!descriptor) {
      return { ready: false, reason: "Provider not found" };
    }

    const config = getProviderConfig(providerId);
    
    if (!descriptor.capabilities.requiresApiKey || descriptor.id === "openrouter") {
      return { ready: true };
    }

    if (!config?.apiKey || config.apiKey.trim() === "") {
      return { ready: false, reason: "API key required" };
    }

    return { ready: true };
  }, [getDescriptor, getProviderConfig]);

  const getAllProviders = useCallback(() => {
    return Object.keys(providers) as ProviderId[];
  }, [providers]);

  return {
    getDescriptor,
    getCapabilities,
    canSolveImage,
    canTranscribeAudio,
    canUseGrounding,
    canUseCustomBaseUrl,
    canLoadModelCatalog,
    validateProviderReady,
    getProviderConfig,
    getAllProviders,
  };
}

export default useProviderCapabilities;
