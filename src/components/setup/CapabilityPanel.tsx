import { Mic, Search } from "lucide-react";

import type { ProviderDescriptor, ProviderRuntimeConfig } from "../../types";

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
  return (
    <div className="space-y-4 rounded-[1.5rem] border border-(--aqs-ink)/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Capability surface</div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          The app shows what this provider can honestly do in the local-first browser build.
        </p>
      </div>
      <CapabilityRow title="Fast and deep text solve" active />
      <CapabilityRow title="Browser image solve" active={provider.capabilities.supportsImageInputInBrowser} />
      <CapabilityRow title="Audio transcription" active={provider.capabilities.supportsAudioTranscription} />
      <CapabilityRow title="Live grounding" active={provider.capabilities.supportsGrounding} />

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
            {provider.id === "minimax"
              ? "MiniMax stays text-first here. Choose Gemini or OpenRouter when you need browser image solving."
              : "Everything shown here is available without adding an account or server sync layer."}
          </p>
        </div>
      </div>

      {provider.id === "minimax" ? (
        <div className="flex items-start gap-3 rounded-[1rem] border border-(--aqs-accent)/20 bg-(--aqs-accent-soft)/70 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-(--aqs-accent-dark)/20 dark:bg-[color:rgba(122,31,52,0.18)] dark:text-slate-200">
          MiniMax browser mode is intentionally limited to text and chat in the local-first build.
        </div>
      ) : null}
    </div>
  );
}
