import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BadgeCheck, RefreshCw, UserRound } from "lucide-react";

import type {
  ModelCatalogEntry,
  OpenRouterModelSummary,
  ProviderId,
  ProviderRuntimeConfig,
  RuntimeAISettings,
} from "../types";
import { CapabilityPanel } from "./setup/CapabilityPanel";
import { CredentialSection } from "./setup/CredentialSection";
import { ModelProfileEditor } from "./setup/ModelProfileEditor";
import { ProviderPicker } from "./setup/ProviderPicker";
import {
  getProviderDescriptor,
  getSelectedOpenAICompatiblePreset,
  openAICompatiblePresets,
  providerOrder,
} from "../services/providers/registry";

interface SetupGuideProps {
  settings: RuntimeAISettings;
  transferControls?: ReactNode;
  historyLabel?: string;
  emblemSrc: string;
  openrouterModels: (OpenRouterModelSummary | ModelCatalogEntry)[];
  openrouterLoading: boolean;
  openrouterError: string | null;
  onRefreshOpenRouterModels: () => void;
  onUpdateSettings: (patch: Partial<RuntimeAISettings>) => void;
  onUpdateProviderSettings: (providerId: ProviderId, patch: Partial<ProviderRuntimeConfig>) => void;
  sharedFreeModeAvailable: boolean;
  onResetSettings: () => void;
  onComplete: () => void;
}

type Step = 1 | 2 | 3;
type SetupAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function StepDot({
  index,
  title,
  active,
  complete,
}: {
  index: Step;
  title: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <li className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${
          complete
            ? "border-(--aqs-accent) bg-(--aqs-accent) text-white"
            : active
              ? "border-(--aqs-accent) bg-(--aqs-accent-soft) text-(--aqs-accent-strong)"
              : "border-(--aqs-ink)/12 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
        }`}
      >
        {complete ? <BadgeCheck className="h-4 w-4" /> : index}
      </div>
      <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">{title}</div>
    </li>
  );
}

export function SetupGuide({
  settings,
  transferControls,
  historyLabel,
  emblemSrc,
  openrouterModels,
  openrouterLoading,
  openrouterError,
  onRefreshOpenRouterModels,
  onUpdateSettings,
  onUpdateProviderSettings,
  sharedFreeModeAvailable,
  onResetSettings,
  onComplete,
}: SetupGuideProps) {
  const setupRef = useRef<HTMLElement>(null);
  const selectedProviderId = settings.selectedProviderId;
  const selectedProvider = getProviderDescriptor(selectedProviderId);
  const selectedConfig = settings.providers[selectedProviderId];
  const selectedPreset = selectedProviderId === "openai_compatible" ? getSelectedOpenAICompatiblePreset(selectedConfig) : null;
  const selectedRequiresKey = selectedPreset?.capabilities.requiresApiKey ?? selectedProvider.capabilities.requiresApiKey;
  const providerKeyPresent = !selectedRequiresKey || Boolean(selectedConfig.apiKey?.trim());
  const [step, setStep] = useState<Step>(settings.onboardingCompleted && providerKeyPresent ? 3 : 1);
  const usingOpenRouterFreeMode =
    selectedProviderId === "openrouter" &&
    settings.freeModeEnabled &&
    Boolean(settings.legalAcceptedAt) &&
    sharedFreeModeAvailable;
  const openRouterFreeModeUnavailable = selectedProviderId === "openrouter" && !sharedFreeModeAvailable;
  const canFinish = providerKeyPresent || usingOpenRouterFreeMode;
  const providers = useMemo(
    () => providerOrder.map((providerId) => getProviderDescriptor(providerId)),
    [],
  );

  const selectOpenAICompatiblePreset = (presetId: string) => {
    const preset = openAICompatiblePresets.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }
    onUpdateSettings({ selectedProviderId: "openai_compatible" });
    onUpdateProviderSettings("openai_compatible", {
      baseUrl: preset.defaultBaseUrl,
      models: { ...preset.defaultModels },
      options: { ...settings.providers.openai_compatible.options, presetId: preset.id },
    });
    goToStep(2);
  };

  const goToStep = (nextStep: Step) => {
    setStep(nextStep);
    window.requestAnimationFrame(() => {
      setupRef.current?.scrollIntoView({ block: "start" });
    });
  };

  const primaryAction: SetupAction =
    step === 1
      ? {
          label: "Continue to credentials",
          onClick: () => goToStep(2),
        }
      : step === 2
        ? {
            label: "Continue to defaults",
            onClick: () => goToStep(3),
            disabled: !(providerKeyPresent || usingOpenRouterFreeMode),
          }
        : {
            label: "Save and close",
            onClick: onComplete,
            disabled: !canFinish,
          };
  const secondaryAction: SetupAction | null =
    step === 1
      ? null
      : {
          label: "Back",
          onClick: () => goToStep(step === 2 ? 1 : 2),
        };

  return (
    <section
      ref={setupRef}
      className="overflow-hidden rounded-[2.3rem] border border-(--aqs-ink)/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,241,236,0.94))] shadow-[0_32px_80px_rgba(37,27,31,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(29,18,26,0.88))]"
    >
      <div className="border-b border-(--aqs-ink)/8 px-5 py-5 pr-16 dark:border-white/10 md:px-6 md:py-6 md:pr-20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4">
              <div className="neo-border-thin h-14 w-14 overflow-hidden rounded-[1.35rem] bg-white dark:bg-slate-900">
                <img src={emblemSrc} alt="Mike Answers mascot" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                  Mike settings
                </div>
                <h2 className="mt-2 text-[1.75rem] font-black tracking-tight text-(--aqs-ink) dark:text-white md:text-[2rem]">
                  Set up Mike Answers.
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Pick the AI route, choose whether Mike remembers your key, and get back to the same draft.
            </p>
          </div>

          <ol className="flex flex-wrap gap-4" aria-label="Setup progress">
            <StepDot index={1} title="Provider" active={step === 1} complete={step > 1} />
            <StepDot index={2} title="Credentials" active={step === 2} complete={step > 2} />
            <StepDot index={3} title="Defaults" active={step === 3} complete={Boolean(step === 3 && canFinish)} />
          </ol>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 pb-28 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-6">
        <div className="space-y-6">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-(--aqs-ink) dark:text-white">Pick the runtime path</h3>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Most students should start with Gemini because Google AI Studio offers a free Gemini API tier and Mike can use it for text, screenshots, grounding, and audio. ChatGPT, Claude, xAI, DeepInfra, Hugging Face, Cohere, and local routes are below — or search the full catalog for more.
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-(--aqs-accent)/16 bg-(--aqs-accent-soft)/75 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-(--aqs-accent-dark)/20 dark:bg-[rgba(122,31,52,0.18)] dark:text-slate-200">
                <strong className="text-(--aqs-ink) dark:text-white">Recommended for students:</strong> Gemini is the easiest high-quality default now. The free tier has usage limits and Google says free-tier content may be used to improve products, so use paid BYOK or another provider for sensitive work.
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ selectedProviderId: "gemini" });
                    goToStep(2);
                  }}
                  className="rounded-[1.2rem] border border-emerald-500/28 bg-emerald-50/80 px-4 py-4 text-left transition hover:border-emerald-600/50 hover:bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-950/20"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-200">
                    Best free start
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">
                    Gemini from Google AI Studio
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Get a Gemini key, start free with Flash-Lite, and keep image, audio, and grounded tutoring available.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectOpenAICompatiblePreset("openai")}
                  className="rounded-[1.2rem] border border-(--aqs-accent)/40 bg-(--aqs-accent-soft) px-4 py-4 text-left transition hover:border-(--aqs-accent) hover:bg-(--aqs-accent-soft-strong) dark:border-(--aqs-accent-dark)/30 dark:bg-[rgba(122,31,52,0.18)] dark:hover:bg-[rgba(122,31,52,0.24)]"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    ChatGPT route
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">ChatGPT / OpenAI</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Use your OpenAI key and pick GPT Fast and Deep models from a dropdown.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectOpenAICompatiblePreset("anthropic")}
                  className="rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 text-left transition hover:border-(--aqs-accent)/30 hover:bg-(--aqs-paper-strong) dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Claude route
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">Claude / Anthropic</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Use Anthropic's OpenAI-compatible layer for Claude models.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectOpenAICompatiblePreset("xai")}
                  className="rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 text-left transition hover:border-(--aqs-accent)/30 hover:bg-(--aqs-paper-strong) dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    xAI route
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">xAI / Grok</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Use your xAI key for Grok fast and reasoning model choices.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectOpenAICompatiblePreset("deepinfra")}
                  className="rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 text-left transition hover:border-(--aqs-accent)/30 hover:bg-(--aqs-paper-strong) dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Open-source hub
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">DeepInfra</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Broad open-source catalog: DeepSeek, Llama, Qwen, Mistral, Kimi, and GLM models.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectOpenAICompatiblePreset("huggingface")}
                  className="rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 text-left transition hover:border-(--aqs-accent)/30 hover:bg-(--aqs-paper-strong) dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Community catalog
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">Hugging Face Inference</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Access 700K+ community and first-party models via OpenAI-compatible API.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectOpenAICompatiblePreset("cohere")}
                  className="rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 text-left transition hover:border-(--aqs-accent)/30 hover:bg-(--aqs-paper-strong) dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Enterprise RAG
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">Cohere</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Command A and R series models for reasoning, RAG, and tool use with trial credits.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectOpenAICompatiblePreset("bedrock")}
                  className="rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 text-left transition hover:border-(--aqs-accent)/30 hover:bg-(--aqs-paper-strong) dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    AWS enterprise
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">Amazon Bedrock</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Claude, Llama, and Mistral through AWS with enterprise compliance.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectOpenAICompatiblePreset("hyperbolic")}
                  className="rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 text-left transition hover:border-(--aqs-accent)/30 hover:bg-(--aqs-paper-strong) dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Privacy first
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">Hyperbolic</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Zero data retention, free $10 credits, and open-source DeepSeek/Llama/Qwen models.
                  </p>
                </button>
              </div>
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Search providers
                </div>
              <ProviderPicker
                providers={providers}
                selectedProviderId={selectedProviderId}
                selectedPresetId={settings.providers.openai_compatible.options?.presetId}
                onSelect={(providerId) => {
                  onUpdateSettings({ selectedProviderId: providerId });
                  goToStep(2);
                }}
                onSelectPreset={(preset) => {
                  onUpdateSettings({ selectedProviderId: "openai_compatible" });
                  onUpdateProviderSettings("openai_compatible", {
                    baseUrl: preset.defaultBaseUrl,
                    models: { ...preset.defaultModels },
                    options: { ...settings.providers.openai_compatible.options, presetId: preset.id },
                  });
                  goToStep(2);
                }}
              />
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-(--aqs-ink) dark:text-white">Set credentials</h3>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Paste a key when the selected provider needs one, or use a local route like Ollama when it is already running on this device.
                </p>
              </div>
              <CredentialSection
                provider={selectedProvider}
                config={selectedConfig}
                onConfigChange={(patch) => onUpdateProviderSettings(selectedProviderId, patch)}
              />
              {selectedProviderId === "openrouter" ? (
                <div className="rounded-[1.2rem] border border-(--aqs-accent)/18 bg-(--aqs-accent-soft)/75 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-(--aqs-accent-dark)/25 dark:bg-[rgba(122,31,52,0.18)] dark:text-slate-200">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Secure free mode
                  </div>
                  <p className="mt-2">
                    If no user key is provided, this deployment can use a limited shared free route when available. This path is rate-limited and lower quality than BYOK.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        sharedFreeModeAvailable
                          ? onUpdateSettings({ freeModeEnabled: !settings.freeModeEnabled })
                          : undefined
                      }
                      disabled={!sharedFreeModeAvailable}
                      className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${
                        settings.freeModeEnabled
                          ? "border-(--aqs-accent) bg-(--aqs-accent) text-white"
                          : "border-(--aqs-ink)/12 bg-white text-(--aqs-ink) dark:border-white/15 dark:bg-slate-950 dark:text-white"
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      {!sharedFreeModeAvailable
                        ? "Free mode unavailable"
                        : settings.freeModeEnabled
                          ? "Free mode on"
                          : "Enable free mode"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ legalAcceptedAt: Date.now() })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${
                        settings.legalAcceptedAt
                          ? "border-emerald-500 bg-emerald-600 text-white"
                          : "border-(--aqs-ink)/12 bg-white text-(--aqs-ink) dark:border-white/15 dark:bg-slate-950 dark:text-white"
                      }`}
                    >
                      {settings.legalAcceptedAt ? "Legal notice accepted" : "Accept legal notice"}
                    </button>
                    <a
                      href="https://github.com/baney75/Mike-Answers/blob/main/LEGAL_SAFETY.md"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-(--aqs-ink)/12 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-(--aqs-ink) dark:border-white/15 dark:bg-slate-950 dark:text-white"
                    >
                      Read safety doc
                    </a>
                  </div>
                  {!settings.legalAcceptedAt ? (
                    <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      Legal notice acknowledgement is required to continue without your own API key.
                    </p>
                  ) : null}
                  {!sharedFreeModeAvailable ? (
                    <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      Shared secure free mode is not configured on this deployment. Add your own OpenRouter key to continue.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="hidden flex-wrap gap-3 lg:flex">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="rounded-full border border-(--aqs-ink)/10 bg-white px-4 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  Back
                </button>
                <PrimaryActionButton action={primaryAction} />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-(--aqs-ink) dark:text-white">Tune the defaults</h3>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Fast and deep are the core knobs. Extra slots appear only when the provider actually supports them.
                </p>
              </div>

              {(() => {
                const usesCatalog = selectedPreset?.capabilities.supportsModelCatalog ?? selectedProvider.capabilities.supportsModelCatalog;
                return usesCatalog ? (
                  <div className="space-y-5 rounded-3xl border border-(--aqs-ink)/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Model catalog</div>
                        <div className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {selectedProviderId === "openrouter"
                            ? <>Use OpenRouter discovery. With <strong>Free only</strong> on, auto-pick uses OpenRouter's official free router.</>
                            : <>Live models fetched from the provider. Pick your <strong>fast</strong> and <strong>deep</strong> defaults below.</>}
                        </div>
                      </div>
                      {selectedProviderId === "openrouter" ? (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProviderSettings("openrouter", {
                              options: {
                                ...settings.providers.openrouter.options,
                                freeOnly: !settings.providers.openrouter.options?.freeOnly,
                              },
                            })
                          }
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${
                            settings.providers.openrouter.options?.freeOnly
                              ? "bg-(--aqs-accent) text-white"
                              : "border border-(--aqs-ink)/10 bg-white text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                          }`}
                        >
                          {settings.providers.openrouter.options?.freeOnly ? "Free only: on" : "Free only: off"}
                        </button>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={onRefreshOpenRouterModels}
                        className="inline-flex items-center gap-2 rounded-full border border-(--aqs-ink)/10 bg-white px-3 py-2 font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      >
                        <RefreshCw className={`h-4 w-4 ${openrouterLoading ? "animate-spin" : ""}`} />
                        Refresh models
                      </button>
                      <span>{openrouterModels.length} options visible</span>
                      {openrouterError ? <span className="text-rose-600 dark:text-rose-300">{openrouterError}</span> : null}
                    </div>

                    <ModelProfileEditor
                      provider={selectedProvider}
                      models={selectedConfig.models}
                      openrouterModels={openrouterModels}
                      modelOptions={selectedPreset?.modelOptions ?? selectedProvider.modelOptions}
                      onChange={(patch) =>
                        onUpdateProviderSettings(selectedProviderId, {
                          models: {
                            ...selectedConfig.models,
                            ...patch,
                          },
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-5 rounded-3xl border border-(--aqs-ink)/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
                    <ModelProfileEditor
                      provider={selectedProvider}
                      models={selectedConfig.models}
                      openrouterModels={[]}
                      modelOptions={selectedPreset?.modelOptions ?? selectedProvider.modelOptions}
                      onChange={(patch) =>
                        onUpdateProviderSettings(selectedProviderId, {
                          models: {
                            ...selectedConfig.models,
                            ...patch,
                          },
                        })
                      }
                    />
                  </div>
                );
              })()}

              <CapabilityPanel provider={selectedProvider} config={selectedConfig} />

              <div className="space-y-4 rounded-3xl border border-(--aqs-ink)/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Home screen
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Keep the tutoring surface focused. Hide these when you want a cleaner class or presentation view.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={!settings.hideMikeNotes}
                    onClick={() => onUpdateSettings({ hideMikeNotes: !settings.hideMikeNotes })}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      settings.hideMikeNotes
                        ? "border-(--aqs-ink)/10 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                        : "border-(--aqs-accent)/35 bg-(--aqs-accent-soft) text-(--aqs-ink) dark:border-(--aqs-accent-dark)/30 dark:bg-[rgba(122,31,52,0.2)] dark:text-white"
                    }`}
                  >
                    <div className="text-sm font-black">Mike's Notes</div>
                    <p className="mt-1 text-xs leading-5 opacity-75">
                      {settings.hideMikeNotes ? "Hidden on the home screen." : "Shown above the question box."}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-pressed={!settings.hideDonateButton}
                    onClick={() => onUpdateSettings({ hideDonateButton: !settings.hideDonateButton })}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      settings.hideDonateButton
                        ? "border-(--aqs-ink)/10 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                        : "border-(--aqs-accent)/35 bg-(--aqs-accent-soft) text-(--aqs-ink) dark:border-(--aqs-accent-dark)/30 dark:bg-[rgba(122,31,52,0.2)] dark:text-white"
                    }`}
                  >
                    <div className="text-sm font-black">Support button</div>
                    <p className="mt-1 text-xs leading-5 opacity-75">
                      {settings.hideDonateButton ? "Hidden from the header." : "Shown in the header."}
                    </p>
                  </button>
                </div>
              </div>

              <div className="hidden flex-wrap gap-3 lg:flex">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="rounded-full border border-(--aqs-ink)/10 bg-white px-4 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onResetSettings}
                  className="rounded-full border border-(--aqs-ink)/10 bg-white px-4 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  Reset
                </button>
                <PrimaryActionButton action={primaryAction} />
              </div>
              <p className="text-xs font-medium leading-6 text-slate-500 dark:text-slate-400">
                Mike keeps the current question draft in place while this setup sheet is open.
              </p>
            </>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.7rem] border border-(--aqs-ink)/10 bg-white/82 p-4 dark:border-white/10 dark:bg-slate-950/58">
            <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Selected provider</div>
                <div className="mt-2 text-lg font-black text-(--aqs-accent)">
                  {selectedPreset ? selectedPreset.label : selectedProvider.label}
                </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {selectedPreset ? selectedPreset.shortDescription : selectedProvider.shortDescription}
            </p>
            <div className="mt-3 rounded-2xl border border-(--aqs-ink)/10 bg-(--aqs-paper-strong) px-3 py-3 text-xs leading-5 text-slate-600 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300">
              <div><strong>Privacy:</strong> {(selectedPreset ?? selectedProvider).policy.privacySummary}</div>
              <div><strong>Retention:</strong> {(selectedPreset ?? selectedProvider).policy.retentionSummary}</div>
              <div><strong>Training:</strong> {(selectedPreset ?? selectedProvider).policy.trainingSummary}</div>
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-(--aqs-ink)/10 bg-white/82 p-4 dark:border-white/10 dark:bg-slate-950/58">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 h-5 w-5 text-(--aqs-accent)" />
              <div>
                <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">
                  Guest mode
                </div>
                <div className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Recommended: stay local-only. Keys and history remain on this browser with no account required.
                </div>
                <div className="mt-3 rounded-full border border-(--aqs-ink)/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                  {historyLabel ?? "Browser local"}
                </div>
              </div>
            </div>
          </div>

          {transferControls ? <div>{transferControls}</div> : null}
        </aside>
      </div>
      <div className="fixed bottom-4 left-6 right-6 z-60 rounded-3xl border border-(--aqs-ink)/10 bg-white/94 px-4 py-4 shadow-[0_18px_50px_rgba(31,23,28,0.22)] backdrop-blur dark:border-white/10 dark:bg-slate-950/90 md:left-10 md:right-10 lg:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            {step === 1
              ? "Choose a provider, or continue with Gemini to add a key."
              : canFinish
              ? "Setup is ready. You can close this sheet and keep working."
              : openRouterFreeModeUnavailable
                ? "Add your own OpenRouter key to continue on this deployment."
                : selectedProviderId === "openrouter"
                ? "Add a key, or enable free mode and accept the notice to continue."
                : selectedRequiresKey
                  ? `Add a ${(selectedPreset ?? selectedProvider).label} key to continue.`
                  : `${(selectedPreset ?? selectedProvider).label} does not require a key here.`}
          </div>
          <div className="flex shrink-0 gap-2">
            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="rounded-full border border-(--aqs-ink)/10 bg-white px-4 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
              >
                {secondaryAction.label}
              </button>
            ) : null}
            <PrimaryActionButton action={primaryAction} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PrimaryActionButton({ action }: { action: SetupAction }) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
        action.disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          : "border-(--aqs-accent) bg-(--aqs-accent) text-white hover:bg-(--aqs-accent-strong)"
      }`}
    >
      {action.label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
