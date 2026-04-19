import { useEffect, useState } from "react";

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
import { decryptSecretFromStorage, encryptSecretForStorage } from "../services/localVault";

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
  selectedProviderId: "gemini",
  preferredSubject: undefined,
  preferredLocation: undefined,
  onboardingCompleted: false,
  providers: createDefaultProviderRuntimeConfigs(),
};

function getSecretStorageKey(providerId: ProviderId) {
  return `aqs_secret_provider_${providerId}_v1`;
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

function applySnapshot(snapshot: UserPreferencesSnapshot): RuntimeAISettings {
  const providers = createDefaultProviderRuntimeConfigs();

  return {
    ...DEFAULT_SETTINGS,
    ...snapshot,
    providers: {
      gemini: mergeProviderRuntime(providers.gemini, snapshot.providers.gemini),
      openrouter: mergeProviderRuntime(providers.openrouter, snapshot.providers.openrouter),
      minimax: mergeProviderRuntime(providers.minimax, snapshot.providers.minimax),
      custom_openai: mergeProviderRuntime(providers.custom_openai, snapshot.providers.custom_openai),
    },
  };
}

function readStoredSecretValue(providerId: ProviderId) {
  if (typeof window === "undefined") {
    return "";
  }

  const key = getSecretStorageKey(providerId);
  return (
    window.localStorage.getItem(key) ??
    window.sessionStorage.getItem(key) ??
    (providerId === "gemini"
      ? window.localStorage.getItem(LEGACY_GEMINI_SECRET_STORAGE_KEY) ?? window.sessionStorage.getItem(LEGACY_GEMINI_SECRET_STORAGE_KEY)
      : providerId === "openrouter"
        ? window.localStorage.getItem(LEGACY_OPENROUTER_SECRET_STORAGE_KEY) ?? window.sessionStorage.getItem(LEGACY_OPENROUTER_SECRET_STORAGE_KEY)
        : "") ??
    ""
  );
}

async function loadStoredSecret(providerId: ProviderId) {
  const stored = readStoredSecretValue(providerId);
  if (!stored) {
    return "";
  }

  try {
    return await decryptSecretFromStorage(stored);
  } catch {
    return "";
  }
}

async function persistSecret(providerId: ProviderId, value: string | undefined, remember: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getSecretStorageKey(providerId);

  try {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    if (providerId === "gemini") {
      window.localStorage.removeItem(LEGACY_GEMINI_SECRET_STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_GEMINI_SECRET_STORAGE_KEY);
    }
    if (providerId === "openrouter") {
      window.localStorage.removeItem(LEGACY_OPENROUTER_SECRET_STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_OPENROUTER_SECRET_STORAGE_KEY);
    }

    if (!value?.trim()) {
      return;
    }

    const encrypted = await encryptSecretForStorage(value.trim());
    const targetStorage = remember ? window.localStorage : window.sessionStorage;
    targetStorage.setItem(storageKey, encrypted);
  } catch {
    // Storage or crypto can be unavailable in some browser contexts.
  }
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

  return applySnapshot({
    selectedProviderId: legacy.provider ?? "gemini",
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
      return applySnapshot({
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
  const next = applySnapshot(remoteSnapshot);

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
  const [secretsHydrated, setSecretsHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const providerIds = Object.keys(createDefaultProviderRuntimeConfigs()) as ProviderId[];
      const secrets = await Promise.all(providerIds.map(async (providerId) => [providerId, await loadStoredSecret(providerId)] as const));

      if (cancelled) {
        return;
      }

      setSettings((current) => ({
        ...current,
        providers: providerIds.reduce<RuntimeAISettings["providers"]>((next, providerId) => {
          const secret = secrets.find(([id]) => id === providerId)?.[1] ?? "";
          next[providerId] = {
            ...current.providers[providerId],
            apiKey: secret,
          };
          return next;
        }, { ...current.providers }),
      }));
      setSecretsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeForStorage(settings)));
    } catch {
      // Storage can be unavailable in some browsing modes.
    }
  }, [settings]);

  useEffect(() => {
    if (!secretsHydrated) {
      return;
    }

    void (async () => {
      for (const providerId of Object.keys(settings.providers) as ProviderId[]) {
        await persistSecret(
          providerId,
          settings.providers[providerId].apiKey,
          Boolean(settings.providers[providerId].rememberKey),
        );
      }
    })();
  }, [secretsHydrated, settings.providers]);

  useEffect(() => {
    if (!remoteSnapshot) {
      return;
    }

    setSettings((current) => mergeRemoteSnapshot(current, remoteSnapshot));
  }, [remoteSnapshot]);

  useEffect(() => {
    if (onPreferencesChange && remoteSnapshot === undefined) {
      return;
    }

    void onPreferencesChange?.(sanitizePreferences(settings));
  }, [onPreferencesChange, remoteSnapshot, settings]);

  return {
    settings,
    secretsHydrated,
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
    replaceSettings: (next: RuntimeAISettings) => setSettings(next),
    resetSettings: () => setSettings(DEFAULT_SETTINGS),
    syncedPreferences: sanitizePreferences(settings),
  };
}
