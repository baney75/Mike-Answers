import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, BadgeCheck, RefreshCw, UserRound } from "lucide-react";

import type {
  AuthWorkspaceState,
  OpenRouterModelSummary,
  ProviderId,
  ProviderRuntimeConfig,
  RuntimeAISettings,
  SecureProviderKeyStatus,
} from "../types";
import { CapabilityPanel } from "./setup/CapabilityPanel";
import { CredentialSection } from "./setup/CredentialSection";
import { ModelProfileEditor } from "./setup/ModelProfileEditor";
import { ProviderPicker } from "./setup/ProviderPicker";
import { getProviderDescriptor, providerOrder } from "../services/providers/registry";

interface SetupGuideProps {
  settings: RuntimeAISettings;
  authState?: AuthWorkspaceState;
  accountControls?: ReactNode;
  historyLabel?: string;
  emblemSrc: string;
  openrouterModels: OpenRouterModelSummary[];
  openrouterLoading: boolean;
  openrouterError: string | null;
  onRefreshOpenRouterModels: () => void;
  secureKeyStatus?: SecureProviderKeyStatus;
  onStoreSecureKey?: (provider: ProviderId, apiKey: string) => Promise<void>;
  onDeleteSecureKey?: (provider: ProviderId) => Promise<void>;
  onUpdateSettings: (patch: Partial<RuntimeAISettings>) => void;
  onUpdateProviderSettings: (providerId: ProviderId, patch: Partial<ProviderRuntimeConfig>) => void;
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
            ? "border-[var(--aqs-accent)] bg-[var(--aqs-accent)] text-white"
            : active
              ? "border-[var(--aqs-accent)] bg-[var(--aqs-accent-soft)] text-[var(--aqs-accent-strong)]"
              : "border-[var(--aqs-ink)]/12 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
        }`}
      >
        {complete ? <BadgeCheck className="h-4 w-4" /> : index}
      </div>
      <div className="text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">{title}</div>
    </div>
  );
}

export function SetupGuide({
  settings,
  authState,
  accountControls,
  historyLabel,
  emblemSrc,
  openrouterModels,
  openrouterLoading,
  openrouterError,
  onRefreshOpenRouterModels,
  secureKeyStatus,
  onStoreSecureKey,
  onDeleteSecureKey,
  onUpdateSettings,
  onUpdateProviderSettings,
  onResetSettings,
  onComplete,
}: SetupGuideProps) {
  const [step, setStep] = useState<Step>(settings.onboardingCompleted ? 3 : 1);
  const [secureKeyError, setSecureKeyError] = useState<string | null>(null);

  const selectedProviderId = settings.selectedProviderId;
  const selectedProvider = getProviderDescriptor(selectedProviderId);
  const selectedConfig = settings.providers[selectedProviderId];
  const secureProviderKeyPresent = Boolean(secureKeyStatus?.[selectedProviderId]);
  const localProviderKeyPresent = Boolean(selectedConfig.apiKey?.trim());
  const providerKeyPresent = secureProviderKeyPresent || localProviderKeyPresent;
  const signedInSecureWorkspace = Boolean(authState?.signedIn && authState.syncReady && onStoreSecureKey);
  const canFinish = providerKeyPresent;
  const providers = useMemo(
    () => providerOrder.map((providerId) => getProviderDescriptor(providerId)),
    [],
  );

  async function storeSecureKey() {
    if (!onStoreSecureKey || !selectedConfig.apiKey?.trim()) {
      return;
    }

    setSecureKeyError(null);
    try {
      await onStoreSecureKey(selectedProviderId, selectedConfig.apiKey.trim());
      onUpdateProviderSettings(selectedProviderId, {
        apiKey: "",
        rememberKey: false,
      });
    } catch (error) {
      setSecureKeyError(error instanceof Error ? error.message : "Could not save the key securely.");
    }
  }

  return (
    <section className="overflow-hidden rounded-[2.3rem] border border-[var(--aqs-ink)]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,241,236,0.94))] shadow-[0_32px_80px_rgba(37,27,31,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(29,18,26,0.88))]">
      <div className="border-b border-[var(--aqs-ink)]/8 px-6 py-6 dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4">
              <div className="neo-border-thin h-16 w-16 overflow-hidden rounded-[1.5rem] bg-white dark:bg-slate-900">
                <img src={emblemSrc} alt="Mike Answers emblem" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                  Mike settings
                </div>
                <h2 className="mt-2 text-[2rem] font-black tracking-tight text-[var(--aqs-ink)] dark:text-white">
                  Provider control, without the guesswork.
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Choose a provider, decide where its key lives, and set only the models that actually matter.
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
                <h3 className="text-xl font-bold text-[var(--aqs-ink)] dark:text-white">Pick the runtime path</h3>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Presets keep setup honest. Advanced custom routing stays available when you need it.
                </p>
              </div>
              <ProviderPicker
                providers={providers}
                selectedProviderId={selectedProviderId}
                secureKeyStatus={secureKeyStatus}
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
                <h3 className="text-xl font-bold text-[var(--aqs-ink)] dark:text-white">Set credentials</h3>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Browser-first stays the default. Signed-in users can also store keys in the encrypted vault.
                </p>
              </div>
              <CredentialSection
                provider={selectedProvider}
                config={selectedConfig}
                signedInSecureWorkspace={signedInSecureWorkspace}
                secureKeyPresent={secureProviderKeyPresent}
                secureKeyError={secureKeyError}
                onConfigChange={(patch) => onUpdateProviderSettings(selectedProviderId, patch)}
                onStoreSecureKey={signedInSecureWorkspace ? onStoreSecureKey : undefined}
                onDeleteSecureKey={onDeleteSecureKey}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-full border border-[var(--aqs-ink)]/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--aqs-ink)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  Back
                </button>
                {signedInSecureWorkspace ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedConfig.apiKey?.trim()) {
                        await storeSecureKey();
                      }
                      setStep(3);
                    }}
                    disabled={!providerKeyPresent}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--aqs-accent)] bg-[var(--aqs-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--aqs-accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!providerKeyPresent}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--aqs-accent)] bg-[var(--aqs-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--aqs-accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[var(--aqs-ink)] dark:text-white">Tune the defaults</h3>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Fast and deep are the core knobs. Extra slots appear only when the provider actually supports them.
                </p>
              </div>

              {selectedProviderId === "openrouter" ? (
                <div className="space-y-5 rounded-[1.5rem] border border-[var(--aqs-ink)]/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">Model catalog</div>
                      <div className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Use OpenRouter discovery if you want a safer preset list.
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
                          ? "bg-[var(--aqs-accent)] text-white"
                          : "border border-[var(--aqs-ink)]/10 bg-white text-[var(--aqs-ink)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      }`}
                    >
                      {settings.providers.openrouter.options?.freeOnly ? "Free only: on" : "Free only: off"}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={onRefreshOpenRouterModels}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--aqs-ink)]/10 bg-white px-3 py-2 font-semibold text-[var(--aqs-ink)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
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
                <div className="space-y-5 rounded-[1.5rem] border border-[var(--aqs-ink)]/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
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
                  className="rounded-full border border-[var(--aqs-ink)]/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--aqs-ink)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onResetSettings}
                  className="rounded-full border border-[var(--aqs-ink)]/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--aqs-ink)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onComplete}
                  disabled={!canFinish}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--aqs-accent)] bg-[var(--aqs-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--aqs-accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Save and close
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.7rem] border border-[var(--aqs-ink)]/10 bg-white/82 p-4 dark:border-white/10 dark:bg-slate-950/58">
            <div className="text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">Selected provider</div>
            <div className="mt-2 text-lg font-black text-[var(--aqs-accent)]">{selectedProvider.label}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {selectedProvider.shortDescription}
            </p>
          </div>

          <div className="rounded-[1.7rem] border border-[var(--aqs-ink)]/10 bg-white/82 p-4 dark:border-white/10 dark:bg-slate-950/58">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 h-5 w-5 text-[var(--aqs-accent)]" />
              <div>
                <div className="text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">
                  {authState?.signedIn ? authState.displayName ?? "Signed in" : "Guest mode"}
                </div>
                <div className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {authState?.signedIn
                    ? authState.syncReady
                      ? `History sync: ${historyLabel ?? "Convex"}`
                      : "Clerk is live. Convex still needs deployment."
                    : "Finish setup now and sign in later if you want sync and vault storage."}
                </div>
                <div className="mt-3">{accountControls}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
