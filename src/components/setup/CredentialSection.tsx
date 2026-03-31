import { ArrowUpRight, LockKeyhole, ShieldCheck } from "lucide-react";

import type { ProviderDescriptor, ProviderId, ProviderRuntimeConfig } from "../../types";
import { StorageModeSelector } from "./StorageModeSelector";

export function CredentialSection({
  provider,
  config,
  secureKeyPresent,
  signedInSecureWorkspace,
  secureKeyError,
  onConfigChange,
  onStoreSecureKey,
  onDeleteSecureKey,
}: {
  provider: ProviderDescriptor;
  config: ProviderRuntimeConfig;
  secureKeyPresent: boolean;
  signedInSecureWorkspace: boolean;
  secureKeyError?: string | null;
  onConfigChange: (patch: Partial<ProviderRuntimeConfig>) => void;
  onStoreSecureKey?: (providerId: ProviderId, apiKey: string) => Promise<void>;
  onDeleteSecureKey?: (providerId: ProviderId) => Promise<void>;
}) {
  const apiKey = config.apiKey ?? "";
  const readOnlyBaseUrl = provider.id !== "custom_openai";

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-[var(--aqs-ink)]/10 bg-white/84 p-4 text-sm leading-7 text-slate-700 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-200">
        <div>
          <strong>1.</strong> Open the official setup page for{" "}
          <a
            className="font-semibold text-[var(--aqs-accent-strong)] underline-offset-4 hover:underline dark:text-[var(--aqs-accent-dark)]"
            href={provider.docsUrl}
            target="_blank"
            rel="noreferrer"
          >
            {provider.label}
          </a>{" "}
          <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />.
        </div>
        <div>
          <strong>2.</strong> Paste your key below. Keep it session-only unless this is your device.
        </div>
        {!provider.capabilities.supportsImageInputInBrowser && provider.id !== "custom_openai" ? (
          <div>
            <strong>3.</strong> Browser mode is intentionally limited for this provider. The capability panel below shows what is available.
          </div>
        ) : null}
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {provider.label} API key
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(event) => onConfigChange({ apiKey: event.target.value })}
          placeholder={provider.apiKeyPlaceholder}
          className="w-full rounded-2xl border border-[var(--aqs-ink)]/12 bg-white px-4 py-3 text-sm text-[var(--aqs-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--aqs-accent)] focus:ring-4 focus:ring-[color:rgba(122,31,52,0.12)] dark:border-white/10 dark:bg-slate-900 dark:text-white"
        />
      </label>

      <StorageModeSelector
        remember={Boolean(config.rememberKey)}
        onChange={(rememberKey) => onConfigChange({ rememberKey })}
      />

      {provider.defaultBaseUrl !== undefined ? (
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Base URL
          </span>
          <input
            value={config.baseUrl ?? provider.defaultBaseUrl ?? ""}
            readOnly={readOnlyBaseUrl}
            onChange={(event) => onConfigChange({ baseUrl: event.target.value })}
            className={`w-full rounded-2xl border border-[var(--aqs-ink)]/12 px-4 py-3 text-sm text-[var(--aqs-ink)] outline-none transition dark:border-white/10 dark:text-white ${
              readOnlyBaseUrl
                ? "bg-slate-100/80 dark:bg-slate-950/60"
                : "bg-white focus:border-[var(--aqs-accent)] focus:ring-4 focus:ring-[color:rgba(122,31,52,0.12)] dark:bg-slate-900"
            }`}
          />
        </label>
      ) : null}

      {provider.id === "minimax" ? (
        <button
          type="button"
          onClick={() =>
            onConfigChange({
              options: {
                ...config.options,
                useSecureBackendForAdvanced: !config.options?.useSecureBackendForAdvanced,
              },
            })
          }
          className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition ${
            config.options?.useSecureBackendForAdvanced
              ? "border-[var(--aqs-accent)] bg-[var(--aqs-accent-soft)] dark:bg-[color:rgba(122,31,52,0.22)]"
              : "border-[var(--aqs-ink)]/10 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">
            <LockKeyhole className="h-4 w-4 text-[var(--aqs-accent)]" />
            Secure advanced image understanding
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Uses the signed-in secure backend path for MiniMax-only advanced image workflows.
          </p>
        </button>
      ) : null}

      {signedInSecureWorkspace ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (apiKey.trim()) {
                void onStoreSecureKey?.(provider.id, apiKey.trim());
              }
            }}
            disabled={!apiKey.trim()}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--aqs-accent)] bg-[var(--aqs-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--aqs-accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShieldCheck className="h-4 w-4" />
            Save in encrypted vault
          </button>
          {secureKeyPresent && onDeleteSecureKey ? (
            <button
              type="button"
              onClick={() => void onDeleteSecureKey(provider.id)}
              className="rounded-full border border-[var(--aqs-ink)]/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--aqs-ink)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
            >
              Remove vault key
            </button>
          ) : null}
        </div>
      ) : null}

      {secureKeyPresent ? (
        <div className="rounded-[1.2rem] border border-[var(--aqs-accent)]/18 bg-[var(--aqs-accent-soft)]/70 px-4 py-3 text-sm leading-7 text-slate-700 dark:border-[var(--aqs-accent-dark)]/20 dark:bg-[color:rgba(122,31,52,0.18)] dark:text-slate-200">
          A secure vault key already exists for this provider.
        </div>
      ) : null}

      {secureKeyError ? (
        <div className="rounded-[1.25rem] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-950/25 dark:text-rose-200">
          {secureKeyError}
        </div>
      ) : null}
    </div>
  );
}
