import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, BadgeCheck, RefreshCw, UserRound } from "lucide-react";

import type {
  OpenRouterModelSummary,
  ProviderId,
  ProviderRuntimeConfig,
  RuntimeAISettings,
} from "../types";
import { CapabilityPanel } from "./setup/CapabilityPanel";
import { CredentialSection } from "./setup/CredentialSection";
import { ModelProfileEditor } from "./setup/ModelProfileEditor";
import { ProviderPicker } from "./setup/ProviderPicker";
import { getProviderDescriptor, providerOrder } from "../services/providers/registry";

interface SetupGuideProps {
  settings: RuntimeAISettings;
  transferControls?: ReactNode;
  historyLabel?: string;
  emblemSrc: string;
  openrouterModels: OpenRouterModelSummary[];
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
    <div className="flex items-center gap-3">
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
    </div>
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
  const [step, setStep] = useState<Step>(settings.onboardingCompleted ? 3 : 1);

  const selectedProviderId = settings.selectedProviderId;
  const selectedProvider = getProviderDescriptor(selectedProviderId);
  const selectedConfig = settings.providers[selectedProviderId];
  const providerKeyPresent = Boolean(selectedConfig.apiKey?.trim());
  const usingOpenRouterFreeMode =
    selectedProviderId === "openrouter" &&
    settings.freeModeEnabled &&
    Boolean(settings.legalAcceptedAt) &&
    sharedFreeModeAvailable;
  const canFinish = providerKeyPresent || usingOpenRouterFreeMode;
  const providers = useMemo(
    () => providerOrder.map((providerId) => getProviderDescriptor(providerId)),
    [],
  );

  return (
    <section className="overflow-hidden rounded-[2.3rem] border border-(--aqs-ink)/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,241,236,0.94))] shadow-[0_32px_80px_rgba(37,27,31,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(29,18,26,0.88))]">
      <div className="border-b border-(--aqs-ink)/8 px-5 py-5 dark:border-white/10 md:px-6 md:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4">
              <div className="neo-border-thin h-14 w-14 overflow-hidden rounded-[1.35rem] bg-white dark:bg-slate-900">
                <img src={emblemSrc} alt="Mike Answers emblem" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                  Mike settings
                </div>
                <h2 className="mt-2 text-[1.75rem] font-black tracking-tight text-(--aqs-ink) dark:text-white md:text-[2rem]">
                  Provider control, without the detour.
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Choose a provider, decide where its key lives, and keep only the defaults that matter. Closing this sheet drops you back into the same draft.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <StepDot index={1} title="Provider" active={step === 1} complete={step > 1} />
            <StepDot index={2} title="Credentials" active={step === 2} complete={step > 2} />
            <StepDot index={3} title="Defaults" active={step === 3} complete={Boolean(settings.onboardingCompleted)} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-(--aqs-ink) dark:text-white">Pick the runtime path</h3>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Presets keep setup honest. Advanced custom routing stays available when you need it.
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-(--aqs-accent)/16 bg-(--aqs-accent-soft)/75 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-(--aqs-accent-dark)/20 dark:bg-[color:rgba(122,31,52,0.18)] dark:text-slate-200">
                <strong className="text-(--aqs-ink) dark:text-white">Recommended for students:</strong> start with Gemini for the cleanest free setup and native screenshot support. Use OpenRouter with <strong>Free only</strong> enabled when you want community free models or Gemini hits limits.
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ selectedProviderId: "openrouter" });
                    setStep(2);
                  }}
                  className="rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 text-left transition hover:border-(--aqs-accent)/30 hover:bg-(--aqs-paper-strong) dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Quick free start
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">OpenRouter (Free only)</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Fastest no-key trial path. Great for testing, but quality and limits vary by free model availability.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ selectedProviderId: "gemini" });
                    setStep(2);
                  }}
                  className="rounded-[1.2rem] border border-(--aqs-accent)/40 bg-(--aqs-accent-soft) px-4 py-4 text-left transition hover:border-(--aqs-accent) hover:bg-(--aqs-accent-soft-strong) dark:border-(--aqs-accent-dark)/30 dark:bg-[color:rgba(122,31,52,0.18)] dark:hover:bg-[color:rgba(122,31,52,0.24)]"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Best quality
                  </div>
                  <p className="mt-1 text-sm font-semibold text-(--aqs-ink) dark:text-white">Bring your own key (Gemini first)</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Recommended for reliable collegiate tutoring quality, image support, and better control over quota and privacy settings.
                  </p>
                </button>
              </div>
              <ProviderPicker
                providers={providers}
                selectedProviderId={selectedProviderId}
                onSelect={(providerId) => {
                  onUpdateSettings({ selectedProviderId: providerId });
                  setStep(2);
                }}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-(--aqs-ink) dark:text-white">Set credentials</h3>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Browser-first stays the default. Remembered keys stay encrypted on this device.
                </p>
              </div>
              <CredentialSection
                provider={selectedProvider}
                config={selectedConfig}
                onConfigChange={(patch) => onUpdateProviderSettings(selectedProviderId, patch)}
              />
              {selectedProviderId === "openrouter" ? (
                <div className="rounded-[1.2rem] border border-(--aqs-accent)/18 bg-(--aqs-accent-soft)/75 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-(--aqs-accent-dark)/25 dark:bg-[color:rgba(122,31,52,0.18)] dark:text-slate-200">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
                    Secure free mode
                  </div>
                  <p className="mt-2">
                    If no user key is provided, Mike can use a limited shared free route when available. This path is rate-limited and lower quality than BYOK.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ freeModeEnabled: !settings.freeModeEnabled })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${
                        settings.freeModeEnabled
                          ? "border-(--aqs-accent) bg-(--aqs-accent) text-white"
                          : "border-(--aqs-ink)/12 bg-white text-(--aqs-ink) dark:border-white/15 dark:bg-slate-950 dark:text-white"
                      }`}
                    >
                      {settings.freeModeEnabled ? "Free mode on" : "Enable free mode"}
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
                  {settings.freeModeEnabled && !sharedFreeModeAvailable ? (
                    <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      Shared secure free mode is not configured on this deployment. Add your own key or ask the site owner to enable it.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-full border border-(--aqs-ink)/10 bg-white px-4 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!(providerKeyPresent || usingOpenRouterFreeMode)}
                  className="inline-flex items-center gap-2 rounded-full border border-(--aqs-accent) bg-(--aqs-accent) px-5 py-2 text-sm font-semibold text-white transition hover:bg-(--aqs-accent-strong) disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
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

              {selectedProviderId === "openrouter" ? (
                <div className="space-y-5 rounded-[1.5rem] border border-(--aqs-ink)/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Model catalog</div>
                      <div className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Use OpenRouter discovery if you want a safer preset list. With <strong>Free only</strong> on, leaving the model fields on auto-pick lets Mike use OpenRouter's official free router.
                      </div>
                    </div>
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
                <div className="space-y-5 rounded-[1.5rem] border border-(--aqs-ink)/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
                  <ModelProfileEditor
                    provider={selectedProvider}
                    models={selectedConfig.models}
                    openrouterModels={[]}
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
              )}

              <CapabilityPanel provider={selectedProvider} config={selectedConfig} />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
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
                <button
                  type="button"
                  onClick={onComplete}
                  disabled={!canFinish}
                  className="inline-flex items-center gap-2 rounded-full border border-(--aqs-accent) bg-(--aqs-accent) px-5 py-2 text-sm font-semibold text-white transition hover:bg-(--aqs-accent-strong) disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Save and close
                  <ArrowRight className="h-4 w-4" />
                </button>
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
            <div className="mt-2 text-lg font-black text-(--aqs-accent)">{selectedProvider.label}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {selectedProvider.shortDescription}
            </p>
            <div className="mt-3 rounded-[1rem] border border-(--aqs-ink)/10 bg-(--aqs-paper-strong) px-3 py-3 text-xs leading-5 text-slate-600 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300">
              <div><strong>Privacy:</strong> {selectedProvider.policy.privacySummary}</div>
              <div><strong>Retention:</strong> {selectedProvider.policy.retentionSummary}</div>
              <div><strong>Training:</strong> {selectedProvider.policy.trainingSummary}</div>
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
    </section>
  );
}
