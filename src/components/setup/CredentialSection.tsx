import { ArrowUpRight } from "lucide-react";

import type { ProviderDescriptor, ProviderRuntimeConfig } from "../../types";
import { StorageModeSelector } from "./StorageModeSelector";
import { getProviderBaseUrlError } from "../../utils/urlSafety";

export function CredentialSection({
  provider,
  config,
  onConfigChange,
}: {
  provider: ProviderDescriptor;
  config: ProviderRuntimeConfig;
  onConfigChange: (patch: Partial<ProviderRuntimeConfig>) => void;
}) {
  const apiKey = config.apiKey ?? "";
  const readOnlyBaseUrl = provider.id !== "custom_openai";
  const baseUrlValue = config.baseUrl ?? provider.defaultBaseUrl ?? "";
  const baseUrlError = !readOnlyBaseUrl && baseUrlValue.trim() ? getProviderBaseUrlError(baseUrlValue) : null;

  return (
    <div className="space-y-5">
      {provider.id === "gemini" ? (
        <div className="rounded-[1.35rem] border border-emerald-500/18 bg-emerald-50/85 px-4 py-4 text-sm leading-6 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-950/20 dark:text-emerald-100">
          <strong>Student-friendly free path:</strong> create a Gemini key in Google AI Studio, keep Fast on <code>gemini-2.5-flash-lite</code>, and use Deep only when you actually need a slower walkthrough.
        </div>
      ) : null}

      {provider.id === "openrouter" ? (
        <div className="rounded-[1.35rem] border border-(--aqs-accent)/16 bg-(--aqs-accent-soft)/75 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-(--aqs-accent-dark)/20 dark:bg-[color:rgba(122,31,52,0.18)] dark:text-slate-200">
          <strong>Best free OpenRouter setup:</strong> keep <code>Free only</code> turned on and leave the model pickers on auto-pick unless you want to pin a specific <code>:free</code> model yourself.
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-(--aqs-ink)/10 bg-white/84 p-4 text-sm leading-7 text-slate-700 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-200">
        <div>
          <strong>1.</strong> Open the official setup page for{" "}
          <a
            className="font-semibold text-(--aqs-accent-strong) underline-offset-4 hover:underline dark:text-(--aqs-accent-dark)"
            href={provider.docsUrl}
            target="_blank"
            rel="noreferrer"
          >
            {provider.label}
          </a>{" "}
          <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />.
        </div>
        <div>
          <strong>2.</strong> Paste your key below. By default Mike remembers it on this device with local encryption.
        </div>
        {!provider.capabilities.supportsImageInputInBrowser && provider.id !== "custom_openai" ? (
          <div>
            <strong>3.</strong> Browser mode is intentionally limited for this provider. The capability panel below shows what is available.
          </div>
        ) : null}
      </div>
      <div className="rounded-[1.2rem] border border-amber-300/60 bg-amber-50/90 px-4 py-3 text-xs leading-6 text-amber-900 dark:border-amber-400/35 dark:bg-amber-950/20 dark:text-amber-100">
        <strong>Safety and legal note:</strong> {provider.policy.legalNotice} Mike Answers is an educational tutor, not legal, medical, or licensed professional advice.
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
          className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition placeholder:text-slate-400 focus:border-(--aqs-accent) focus:ring-4 focus:ring-[color:rgba(122,31,52,0.12)] dark:border-white/10 dark:bg-slate-900 dark:text-white"
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
            value={baseUrlValue}
            readOnly={readOnlyBaseUrl}
            onChange={(event) => onConfigChange({ baseUrl: event.target.value })}
            className={`w-full rounded-2xl border border-(--aqs-ink)/12 px-4 py-3 text-sm text-(--aqs-ink) outline-none transition dark:border-white/10 dark:text-white ${
              readOnlyBaseUrl
                ? "bg-slate-100/80 dark:bg-slate-950/60"
                : "bg-white focus:border-(--aqs-accent) focus:ring-4 focus:ring-[color:rgba(122,31,52,0.12)] dark:bg-slate-900"
            }`}
          />
        </label>
      ) : null}

      {baseUrlError ? (
        <div className="rounded-[1.25rem] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/25 dark:text-amber-100">
          {baseUrlError}
        </div>
      ) : null}

      {provider.id === "minimax" ? (
        <div className="rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300">
          MiniMax stays text and chat only in this local-first build. Use Gemini or OpenRouter when you need browser image solving.
        </div>
      ) : null}
    </div>
  );
}
