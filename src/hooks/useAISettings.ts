import { useEffect, useMemo, useState } from "react";

import type {
  ProviderId,
  ProviderPreferenceConfig,
  ProviderRuntimeConfig,
  RuntimeAISettings,
  UserPreferencesSnapshot,
} from "../types";
import {
  createDefaultProviderPreferences,
  createDefaultProviderRuntimeConfigs,
} from "../services/providers/registry";

const STORAGE_KEY = "aqs_runtime_settings_v4";
const LEGACY_STORAGE_KEY = "aqs_runtime_settings_v3";
const LEGACY_GEMINI_SECRET_STORAGE_KEY = "aqs_secret_gemini_v1";
const LEGACY_OPENROUTER_SECRET_STORAGE_KEY = "aqs_secret_openrouter_v1";

interface LegacyRuntimeAISettings {
  provider?: "gemini" | "openrouter";
  preferredSubject?: string;
  preferredLocation?: string;
  geminiFastModel?: string;
  geminiGroundedModel?: string;
  geminiProModel?: string;
  openrouterFastModel?: string;
  openrouterDeepModel?: string;
  openrouterFreeOnly?: boolean;
  rememberGeminiKey?: boolean;
  rememberOpenRouterKey?: boolean;
  onboardingCompleted?: boolean;
}

const DEFAULT_SETTINGS: RuntimeAISettings = {
  selectedProviderId: "openrouter",
  preferredSubject: undefined,
  preferredLocation: undefined,
  onboardingCompleted: false,
  providers: createDefaultProviderRuntimeConfigs(),
};

function getSecretStorageKey(providerId: ProviderId) {
  return `aqs_secret_provider_${providerId}_v1`;
}

function getStoredSecret(storageKey: string, remember: boolean) {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const preferredStorage = remember ? window.localStorage : window.sessionStorage;
    const fallbackStorage = remember ? window.sessionStorage : window.localStorage;
    return preferredStorage.getItem(storageKey) ?? fallbackStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

function persistSecret(storageKey: string, value: string | undefined, remember: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);

    if (!value?.trim()) {
      return;
    }

    const targetStorage = remember ? window.localStorage : window.sessionStorage;
    targetStorage.setItem(storageKey, value.trim());
  } catch {
    // Storage may be blocked or unavailable.
  }
}

function mergeProviderPreference(
  base: ProviderPreferenceConfig,
  patch?: Partial<ProviderPreferenceConfig>,
): ProviderPreferenceConfig {
  return {
    rememberKey: patch?.rememberKey ?? base.rememberKey,
    baseUrl: patch?.baseUrl ?? base.baseUrl,
    models: {
      ...base.models,
      ...patch?.models,
    },
    options: {
      ...base.options,
      ...patch?.options,
    },
  };
}

function mergeProviderRuntime(
  base: ProviderRuntimeConfig,
  patch?: Partial<ProviderRuntimeConfig>,
): ProviderRuntimeConfig {
  return {
    ...mergeProviderPreference(base, patch),
    apiKey: patch?.apiKey ?? base.apiKey,
  };
}

function sanitizeForStorage(settings: RuntimeAISettings): UserPreferencesSnapshot {
  return {
    selectedProviderId: settings.selectedProviderId,
    preferredSubject: settings.preferredSubject,
    preferredLocation: settings.preferredLocation,
    onboardingCompleted: settings.onboardingCompleted,
    providers: {
      gemini: mergeProviderPreference(createDefaultProviderPreferences().gemini, settings.providers.gemini),
      openrouter: mergeProviderPreference(createDefaultProviderPreferences().openrouter, settings.providers.openrouter),
      minimax: mergeProviderPreference(createDefaultProviderPreferences().minimax, settings.providers.minimax),
      custom_openai: mergeProviderPreference(createDefaultProviderPreferences().custom_openai, settings.providers.custom_openai),
    },
  };
}

function applySecrets(snapshot: UserPreferencesSnapshot): RuntimeAISettings {
  const providers = createDefaultProviderRuntimeConfigs();

  const mergedProviders: RuntimeAISettings["providers"] = {
    gemini: mergeProviderRuntime(providers.gemini, snapshot.providers.gemini),
    openrouter: mergeProviderRuntime(providers.openrouter, snapshot.providers.openrouter),
    minimax: mergeProviderRuntime(providers.minimax, snapshot.providers.minimax),
    custom_openai: mergeProviderRuntime(providers.custom_openai, snapshot.providers.custom_openai),
  };

  (Object.keys(mergedProviders) as ProviderId[]).forEach((providerId) => {
    const runtimeConfig = mergedProviders[providerId];
    const storageKey = getSecretStorageKey(providerId);
    const rememberKey = Boolean(runtimeConfig.rememberKey);
    const secret =
      getStoredSecret(storageKey, rememberKey) ||
      (providerId === "gemini"
        ? getStoredSecret(LEGACY_GEMINI_SECRET_STORAGE_KEY, rememberKey)
        : providerId === "openrouter"
          ? getStoredSecret(LEGACY_OPENROUTER_SECRET_STORAGE_KEY, rememberKey)
          : "");

    mergedProviders[providerId] = {
      ...runtimeConfig,
      apiKey: secret,
    };
  });

  return {
    ...DEFAULT_SETTINGS,
    ...snapshot,
    providers: mergedProviders,
  };
}

function migrateLegacySettings(legacy: Partial<LegacyRuntimeAISettings>): RuntimeAISettings {
  const preferences = createDefaultProviderPreferences();

  preferences.gemini = mergeProviderPreference(preferences.gemini, {
    rememberKey: legacy.rememberGeminiKey,
    models: {
      fastModel: legacy.geminiFastModel,
      groundedModel: legacy.geminiGroundedModel,
      deepModel: legacy.geminiProModel,
      transcriptionModel: preferences.gemini.models.transcriptionModel,
    },
  });

  preferences.openrouter = mergeProviderPreference(preferences.openrouter, {
    rememberKey: legacy.rememberOpenRouterKey,
    models: {
      fastModel: legacy.openrouterFastModel,
      deepModel: legacy.openrouterDeepModel,
    },
    options: {
      freeOnly: legacy.openrouterFreeOnly ?? true,
    },
  });

  return applySecrets({
    selectedProviderId: legacy.provider ?? "openrouter",
    preferredSubject: legacy.preferredSubject,
    preferredLocation: legacy.preferredLocation,
    onboardingCompleted: legacy.onboardingCompleted ?? false,
    providers: preferences,
  });
}

function readStoredSettings(): RuntimeAISettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserPreferencesSnapshot;
      return applySecrets({
        ...sanitizeForStorage(DEFAULT_SETTINGS),
        ...parsed,
        providers: {
          ...createDefaultProviderPreferences(),
          ...parsed.providers,
          gemini: mergeProviderPreference(createDefaultProviderPreferences().gemini, parsed.providers?.gemini),
          openrouter: mergeProviderPreference(createDefaultProviderPreferences().openrouter, parsed.providers?.openrouter),
          minimax: mergeProviderPreference(createDefaultProviderPreferences().minimax, parsed.providers?.minimax),
          custom_openai: mergeProviderPreference(createDefaultProviderPreferences().custom_openai, parsed.providers?.custom_openai),
        },
      });
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      return migrateLegacySettings(JSON.parse(legacyRaw) as Partial<LegacyRuntimeAISettings>);
    }
  } catch {
    // Fall through to defaults.
  }

  return DEFAULT_SETTINGS;
}

function sanitizePreferences(settings: RuntimeAISettings): UserPreferencesSnapshot {
  return {
    ...sanitizeForStorage(settings),
    updatedAt: Date.now(),
  };
}

function mergeRemoteSnapshot(
  current: RuntimeAISettings,
  remoteSnapshot: UserPreferencesSnapshot,
): RuntimeAISettings {
  const next = applySecrets(remoteSnapshot);

  return {
    ...current,
    ...next,
    providers: {
      gemini: { ...next.providers.gemini, apiKey: current.providers.gemini.apiKey },
      openrouter: { ...next.providers.openrouter, apiKey: current.providers.openrouter.apiKey },
      minimax: { ...next.providers.minimax, apiKey: current.providers.minimax.apiKey },
      custom_openai: { ...next.providers.custom_openai, apiKey: current.providers.custom_openai.apiKey },
    },
  };
}

interface UseAISettingsOptions {
  remoteSnapshot?: UserPreferencesSnapshot | null;
  onPreferencesChange?: (snapshot: UserPreferencesSnapshot) => void | Promise<void>;
}

export function useAISettings(options: UseAISettingsOptions = {}) {
  const { remoteSnapshot, onPreferencesChange } = options;
  const [settings, setSettings] = useState<RuntimeAISettings>(() => readStoredSettings());
  const remoteFingerprint = useMemo(
    () => JSON.stringify(remoteSnapshot ?? null),
    [remoteSnapshot],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeForStorage(settings)));
    } catch {
      // Storage can be unavailable in some browsing modes.
    }

    (Object.keys(settings.providers) as ProviderId[]).forEach((providerId) => {
      persistSecret(
        getSecretStorageKey(providerId),
        settings.providers[providerId].apiKey,
        Boolean(settings.providers[providerId].rememberKey),
      );
    });
  }, [settings]);

  useEffect(() => {
    if (!remoteSnapshot) {
      return;
    }

    setSettings((current) => mergeRemoteSnapshot(current, remoteSnapshot));
  }, [remoteFingerprint, remoteSnapshot]);

  useEffect(() => {
    if (onPreferencesChange && remoteSnapshot === undefined) {
      return;
    }

    void onPreferencesChange?.(sanitizePreferences(settings));
  }, [onPreferencesChange, remoteSnapshot, settings]);

  return {
    settings,
    updateSettings: (patch: Partial<RuntimeAISettings>) =>
      setSettings((current) => ({ ...current, ...patch })),
    updateProviderSettings: (
      providerId: ProviderId,
      patch: Partial<ProviderRuntimeConfig>,
    ) =>
      setSettings((current) => ({
        ...current,
        providers: {
          ...current.providers,
          [providerId]: mergeProviderRuntime(current.providers[providerId], patch),
        },
      })),
    resetSettings: () => setSettings(DEFAULT_SETTINGS),
    syncedPreferences: sanitizePreferences(settings),
  };
}
