import { Mic, Search } from "lucide-react";

import type { ProviderDescriptor, ProviderRuntimeConfig } from "../../types";
import { getSelectedOpenAICompatiblePreset } from "../../services/providers/registry";

function CapabilityRow({
  title,
  active,
}: {
  title: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-(--aqs-ink)/8 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-slate-950/45">
      <span className="text-sm font-semibold text-(--aqs-ink) dark:text-white">{title}</span>
      <span className={`text-xs font-black uppercase tracking-[0.2em] ${active ? "text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)" : "text-slate-400"}`}>
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
  const preset = provider.id === "openai_compatible" ? getSelectedOpenAICompatiblePreset(config) : null;
  const displayProvider = preset ?? provider;
  const trustTierLabel =
    displayProvider.policy.trustTier === "byok_recommended"
      ? "BYOK recommended"
      : displayProvider.policy.trustTier === "free_trial"
        ? "Free trial tier"
        : displayProvider.policy.trustTier === "enterprise_ready"
          ? "Enterprise-ready"
          : displayProvider.policy.trustTier === "local_first"
            ? "Local first"
            : displayProvider.policy.trustTier === "user_pays"
              ? "User pays"
              : "Experimental";

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-(--aqs-ink)/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Capability surface</div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          The app shows what this provider can honestly do in the local-first browser build.
        </p>
      </div>
      <div className="rounded-[1rem] border border-(--aqs-ink)/8 bg-(--aqs-paper) px-4 py-3 text-sm leading-6 text-slate-700 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
          Trust tier
        </div>
        <div className="mt-1 font-semibold text-(--aqs-ink) dark:text-white">{trustTierLabel}</div>
        <div className="mt-2"><strong>Privacy:</strong> {displayProvider.policy.privacySummary}</div>
        <div><strong>Retention:</strong> {displayProvider.policy.retentionSummary}</div>
      </div>
      <CapabilityRow title="Fast and deep text solve" active />
      <CapabilityRow title="Browser image solve" active={displayProvider.capabilities.supportsImageInputInBrowser} />
      <CapabilityRow title="Audio transcription" active={displayProvider.capabilities.supportsAudioTranscription} />
      <CapabilityRow title="Live grounding" active={displayProvider.capabilities.supportsGrounding} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1rem] border border-(--aqs-ink)/8 bg-(--aqs-paper) px-4 py-4 dark:border-white/10 dark:bg-slate-950/45">
          <div className="flex items-center gap-2 text-sm font-semibold text-(--aqs-ink) dark:text-white">
            <Search className="h-4 w-4 text-(--aqs-accent)" />
            Browser-safe path
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Uses direct API calls from the device when the provider supports them.
          </p>
        </div>
        <div className="rounded-[1rem] border border-(--aqs-ink)/8 bg-(--aqs-paper) px-4 py-4 dark:border-white/10 dark:bg-slate-950/45">
          <div className="flex items-center gap-2 text-sm font-semibold text-(--aqs-ink) dark:text-white">
            <Mic className="h-4 w-4 text-(--aqs-accent)" />
            Local-first guidance
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {displayProvider.capabilities.isLocalOnly
              ? "This depends on a local server that the browser can reach."
              : displayProvider.capabilities.isUserPays
                ? "No key is stored by Mike Answers; Puter asks the user to authenticate when needed."
                : "Everything shown here is available without adding an account or server sync layer."}
          </p>
        </div>
      </div>

      {preset?.capabilities.isLocalOnly ? (
        <div className="flex items-start gap-3 rounded-[1rem] border border-(--aqs-accent)/20 bg-(--aqs-accent-soft)/70 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-(--aqs-accent-dark)/20 dark:bg-[color:rgba(122,31,52,0.18)] dark:text-slate-200">
          Local presets only work when the model server is already running and reachable from the browser.
        </div>
      ) : null}
    </div>
  );
}
