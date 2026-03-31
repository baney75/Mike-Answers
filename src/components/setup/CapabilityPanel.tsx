import { LockKeyhole, Mic, Search, ShieldCheck } from "lucide-react";

import type { ProviderDescriptor, ProviderRuntimeConfig } from "../../types";

function CapabilityRow({
  title,
  active,
}: {
  title: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-[var(--aqs-ink)]/8 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-slate-950/45">
      <span className="text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">{title}</span>
      <span className={`text-xs font-black uppercase tracking-[0.2em] ${active ? "text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]" : "text-slate-400"}`}>
        {active ? "Available" : "Off"}
      </span>
    </div>
  );
}

export function CapabilityPanel({
  provider,
  config,
}: {
  provider: ProviderDescriptor;
  config: ProviderRuntimeConfig;
}) {
  const advancedEnabled = Boolean(config.options?.useSecureBackendForAdvanced);

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-[var(--aqs-ink)]/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">Capability surface</div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          The app shows what this provider can honestly do in-browser and what requires the secure backend.
        </p>
      </div>
      <CapabilityRow title="Fast and deep text solve" active />
      <CapabilityRow title="Browser image solve" active={provider.capabilities.supportsImageInputInBrowser} />
      <CapabilityRow title="Audio transcription" active={provider.capabilities.supportsAudioTranscription} />
      <CapabilityRow title="Live grounding" active={provider.capabilities.supportsGrounding} />
      <CapabilityRow title="Advanced secure tools" active={provider.capabilities.supportsSecureAdvanced && advancedEnabled} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1rem] border border-[var(--aqs-ink)]/8 bg-[var(--aqs-paper)] px-4 py-4 dark:border-white/10 dark:bg-slate-950/45">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">
            <Search className="h-4 w-4 text-[var(--aqs-accent)]" />
            Browser-safe path
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Uses direct API calls from the device when the provider supports them.
          </p>
        </div>
        <div className="rounded-[1rem] border border-[var(--aqs-ink)]/8 bg-[var(--aqs-paper)] px-4 py-4 dark:border-white/10 dark:bg-slate-950/45">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">
            {provider.capabilities.supportsSecureAdvanced ? (
              <ShieldCheck className="h-4 w-4 text-[var(--aqs-accent)]" />
            ) : (
              <Mic className="h-4 w-4 text-[var(--aqs-accent)]" />
            )}
            Secure backend path
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {provider.id === "minimax"
              ? "MiniMax uses this path only for advanced image understanding. Browser mode stays text-first."
              : provider.capabilities.supportsSecureAdvanced
                ? "Advanced flows can be upgraded when the provider supports them."
                : "This provider does not currently add extra secure-only capabilities."}
          </p>
        </div>
      </div>

      {provider.id === "minimax" ? (
        <div className="flex items-start gap-3 rounded-[1rem] border border-[var(--aqs-accent)]/20 bg-[var(--aqs-accent-soft)]/70 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-[var(--aqs-accent-dark)]/20 dark:bg-[color:rgba(122,31,52,0.18)] dark:text-slate-200">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aqs-accent)]" />
          MiniMax browser mode is intentionally limited to text and chat. Image understanding only appears when secure advanced mode is enabled and the backend bridge is configured.
        </div>
      ) : null}
    </div>
  );
}
