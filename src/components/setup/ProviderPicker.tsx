import { BadgeCheck, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { OpenAICompatiblePreset, ProviderDescriptor, ProviderId } from "../../types";
import { openAICompatiblePresets, recommendedProviderIds } from "../../services/providers/registry";

function CapabilityBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-(--aqs-ink)/10 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
      {label}
    </span>
  );
}

function getTrustTierLabel(tier: ProviderDescriptor["policy"]["trustTier"]) {
  switch (tier) {
    case "byok_recommended":
      return "BYOK recommended";
    case "free_trial":
      return "Free trial tier";
    case "enterprise_ready":
      return "Enterprise ready";
    case "local_first":
      return "Local first";
    default:
      return "Experimental";
  }
}

const groupLabels: Record<OpenAICompatiblePreset["group"], string> = {
  popular: "Leading providers",
  openai_compatible: "OpenAI-compatible APIs",
  local: "Local",
  gateway: "Gateways",
};

const leadingPresetIds = new Set(["openai", "anthropic", "xai", "vercel-ai-gateway", "venice", "ollama-cloud", "deepinfra", "cohere", "huggingface", "bedrock", "hyperbolic"]);

function matchesPreset(preset: OpenAICompatiblePreset, query: string) {
  const haystack = [
    preset.label,
    preset.shortDescription,
    preset.group,
    preset.defaultBaseUrl,
    preset.defaultModels.fastModel,
    preset.defaultModels.deepModel,
    ...(preset.aliases ?? []),
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function ProviderPicker({
  providers,
  selectedProviderId,
  selectedPresetId,
  onSelect,
  onSelectPreset,
}: {
  providers: ProviderDescriptor[];
  selectedProviderId: ProviderId;
  selectedPresetId?: string;
  onSelect: (providerId: ProviderId) => void;
  onSelectPreset: (preset: OpenAICompatiblePreset) => void;
}) {
  const [query, setQuery] = useState("");
  const providerMap = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const recommended = recommendedProviderIds
    .map((providerId) => providerMap.get(providerId))
    .filter((provider): provider is ProviderDescriptor => Boolean(provider));
  const visiblePresets = openAICompatiblePresets.filter((preset) => !query.trim() || matchesPreset(preset, query.trim()));
  const groupedPresets = visiblePresets.reduce<Record<OpenAICompatiblePreset["group"], OpenAICompatiblePreset[]>>(
    (groups, preset) => {
      groups[preset.group].push(preset);
      return groups;
    },
    { popular: [], openai_compatible: [], local: [], gateway: [] },
  );

  return (
    <div className="space-y-5">
      <label className="relative block">
        <span className="sr-only">Search providers</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Gemini, ChatGPT, Claude, DeepInfra, Hugging Face, Cohere, Bedrock, xAI, Azure, Hyperbolic, gateways, local tools..."
          className="w-full rounded-2xl border border-(--aqs-ink)/10 bg-white py-3 pl-11 pr-4 text-sm text-(--aqs-ink) outline-none transition placeholder:text-slate-400 focus:border-(--aqs-accent) focus:ring-4 focus:ring-[rgba(122,31,52,0.12)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Recommended providers</legend>
        {recommended.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => onSelect(provider.id)}
            aria-pressed={selectedProviderId === provider.id}
            className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
              selectedProviderId === provider.id
                ? "border-(--aqs-accent) bg-(--aqs-accent) text-white"
                : "border-(--aqs-ink)/10 bg-white text-(--aqs-ink) hover:border-(--aqs-accent)/35 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            }`}
          >
            {provider.id === "openai_compatible" ? "Catalog" : provider.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const ollama = openAICompatiblePresets.find((preset) => preset.id === "ollama");
            if (ollama) {
              onSelectPreset(ollama);
            }
          }}
          aria-pressed={selectedProviderId === "openai_compatible" && selectedPresetId === "ollama"}
          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
            selectedProviderId === "openai_compatible" && selectedPresetId === "ollama"
              ? "border-(--aqs-accent) bg-(--aqs-accent) text-white"
              : "border-(--aqs-ink)/10 bg-white text-(--aqs-ink) hover:border-(--aqs-accent)/35 dark:border-white/10 dark:bg-slate-950 dark:text-white"
          }`}
        >
          Ollama
        </button>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-2">
      {providers.filter((provider) => provider.id !== "openai_compatible").map((provider) => {
        const active = provider.id === selectedProviderId;
          const badges = [
            provider.capabilities.requiresApiKey ? "BYOK" : "No key",
            provider.capabilities.supportsImageInputInBrowser ? "Image" : "Text",
            provider.capabilities.supportsAudioTranscription ? "Voice" : "Manual",
            provider.capabilities.isLocalOnly ? "Local" : provider.capabilities.isGateway ? "Gateway" : "Browser-first",
          ];

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => onSelect(provider.id)}
            aria-pressed={active}
            className={`w-full rounded-[1.7rem] border px-5 py-5 text-left transition ${
              active
                ? "border-(--aqs-accent) bg-(--aqs-accent-soft) shadow-[0_18px_36px_rgba(122,31,52,0.14)] dark:bg-[rgba(122,31,52,0.24)]"
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
              <CapabilityBadge label={getTrustTierLabel(provider.policy.trustTier)} />
              {!provider.capabilities.supportsCustomBaseUrl && provider.id !== "gemini" ? <CapabilityBadge label="Preset URL" /> : null}
            </div>
          </button>
        );
      })}
      </div>

      <div className="space-y-4">
        {query.trim() === "" ? (
          <section className="space-y-3">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Leading providers
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {openAICompatiblePresets.filter((preset) => leadingPresetIds.has(preset.id)).map((preset) => {
                const active = selectedProviderId === "openai_compatible" && selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset)}
                    aria-pressed={active}
                    className={`w-full rounded-3xl border px-5 py-4 text-left transition ${
                      active
                        ? "border-(--aqs-accent) bg-(--aqs-accent-soft) shadow-[0_18px_36px_rgba(122,31,52,0.14)] dark:bg-[rgba(122,31,52,0.24)]"
                        : "border-(--aqs-ink)/10 bg-white/90 hover:-translate-y-0.5 hover:border-(--aqs-accent)/35 dark:border-white/10 dark:bg-slate-950/65"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-bold text-(--aqs-ink) dark:text-white">{preset.label}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {preset.shortDescription}
                        </p>
                      </div>
                      {active ? <BadgeCheck className="h-5 w-5 shrink-0 text-(--aqs-accent)" /> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <CapabilityBadge label="BYOK" />
                      <CapabilityBadge label={preset.capabilities.supportsImageInputInBrowser ? "Image" : "Text"} />
                      <CapabilityBadge label={preset.capabilities.isGateway ? "Gateway" : "API"} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
        {Object.entries(groupLabels).map(([group, label]) => {
          const presets = groupedPresets[group as OpenAICompatiblePreset["group"]];
          if (presets.length === 0) {
            return null;
          }
          if (query.trim() === "" && group === "popular") {
            return null;
          }
          return (
            <section key={group} className="space-y-3">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {label}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {presets.map((preset) => {
                  const active = selectedProviderId === "openai_compatible" && selectedPresetId === preset.id;
                  const badges = [
                    preset.capabilities.requiresApiKey ? "BYOK" : "No key",
                    preset.capabilities.supportsImageInputInBrowser ? "Image" : "Text",
                    preset.capabilities.isLocalOnly ? "Local" : preset.capabilities.isGateway ? "Gateway" : "API",
                  ];
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset)}
                      aria-pressed={active}
                      className={`w-full rounded-3xl border px-5 py-4 text-left transition ${
                        active
                          ? "border-(--aqs-accent) bg-(--aqs-accent-soft) shadow-[0_18px_36px_rgba(122,31,52,0.14)] dark:bg-[rgba(122,31,52,0.24)]"
                          : "border-(--aqs-ink)/10 bg-white/90 hover:-translate-y-0.5 hover:border-(--aqs-accent)/35 dark:border-white/10 dark:bg-slate-950/65"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-bold text-(--aqs-ink) dark:text-white">{preset.label}</div>
                          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {preset.shortDescription}
                          </p>
                        </div>
                        {active ? <BadgeCheck className="h-5 w-5 shrink-0 text-(--aqs-accent)" /> : null}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {badges.map((badge) => (
                          <CapabilityBadge key={badge} label={badge} />
                        ))}
                        <CapabilityBadge label={getTrustTierLabel(preset.policy.trustTier)} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
