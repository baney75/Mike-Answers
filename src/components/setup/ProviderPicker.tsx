import { BadgeCheck } from "lucide-react";

import type { ProviderDescriptor, ProviderId } from "../../types";

function CapabilityBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-(--aqs-ink)/10 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
      {label}
    </span>
  );
}

export function ProviderPicker({
  providers,
  selectedProviderId,
  onSelect,
}: {
  providers: ProviderDescriptor[];
  selectedProviderId: ProviderId;
  onSelect: (providerId: ProviderId) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {providers.map((provider) => {
        const active = provider.id === selectedProviderId;
          const badges = [
            provider.capabilities.supportsImageInputInBrowser ? "Image" : "Text",
            provider.capabilities.supportsAudioTranscription ? "Voice" : "Manual",
            "Browser-first",
          ];

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => onSelect(provider.id)}
            className={`w-full rounded-[1.7rem] border px-5 py-5 text-left transition ${
              active
                ? "border-(--aqs-accent) bg-(--aqs-accent-soft) shadow-[0_18px_36px_rgba(122,31,52,0.14)] dark:bg-[color:rgba(122,31,52,0.24)]"
                : "border-(--aqs-ink)/10 bg-white/90 hover:-translate-y-0.5 hover:border-(--aqs-accent)/35 dark:border-white/10 dark:bg-slate-950/65"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-(--aqs-ink) dark:text-white">{provider.label}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {provider.shortDescription}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {active ? <BadgeCheck className="h-5 w-5 text-(--aqs-accent)" /> : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <CapabilityBadge key={badge} label={badge} />
              ))}
              {!provider.capabilities.supportsCustomBaseUrl && provider.id !== "gemini" ? <CapabilityBadge label="Preset URL" /> : null}
            </div>
            {provider.id === "minimax" ? (
              <div className="mt-4 flex items-start gap-2 rounded-[1rem] border border-(--aqs-ink)/8 bg-white/70 px-3 py-3 text-xs leading-6 text-slate-600 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
                Browser mode is text/chat only in the local-first build.
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
