import type { OpenRouterModelSummary, ProviderModelOption, ProviderModelProfile, ProviderDescriptor } from "../../types";

function ModelField({
  label,
  value,
  onChange,
  options,
  modelOptions,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options?: OpenRouterModelSummary[];
  modelOptions?: ProviderModelOption[];
  placeholder?: string;
}) {
  if (options && options.length > 0) {
    return (
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition focus:border-(--aqs-accent) focus:ring-4 focus:ring-[rgba(122,31,52,0.12)] dark:border-white/10 dark:bg-slate-900 dark:text-white"
        >
          <option value="">Auto-pick recommended model</option>
          {options.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
              {model.supportsImages ? " • image" : ""}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (modelOptions && modelOptions.length > 0) {
    const selectedOption = modelOptions.find((model) => model.id === value) ?? modelOptions[0];
    return (
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition focus:border-(--aqs-accent) focus:ring-4 focus:ring-[rgba(122,31,52,0.12)] dark:border-white/10 dark:bg-slate-900 dark:text-white"
        >
          {modelOptions.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
              {model.supportsImages ? " • image" : ""}
            </option>
          ))}
        </select>
        {selectedOption?.note ? (
          <span className="block text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
            {selectedOption.note}
          </span>
        ) : null}
      </label>
    );
  }

  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition focus:border-(--aqs-accent) focus:ring-4 focus:ring-[rgba(122,31,52,0.12)] dark:border-white/10 dark:bg-slate-900 dark:text-white"
      />
    </label>
  );
}

export function ModelProfileEditor({
  provider,
  models,
  openrouterModels,
  modelOptions,
  onChange,
}: {
  provider: ProviderDescriptor;
  models: ProviderModelProfile;
  openrouterModels: OpenRouterModelSummary[];
  modelOptions?: ProviderModelOption[];
  onChange: (patch: Partial<ProviderModelProfile>) => void;
}) {
  const usesCatalog = provider.id === "openrouter";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ModelField
        label="Fast model"
        value={models.fastModel}
        options={usesCatalog ? openrouterModels : undefined}
        modelOptions={!usesCatalog ? modelOptions ?? provider.modelOptions : undefined}
        placeholder={provider.defaultModels.fastModel}
        onChange={(value) => onChange({ fastModel: value })}
      />
      <ModelField
        label="Deep model"
        value={models.deepModel}
        options={usesCatalog ? openrouterModels : undefined}
        modelOptions={!usesCatalog ? modelOptions ?? provider.modelOptions : undefined}
        placeholder={provider.defaultModels.deepModel}
        onChange={(value) => onChange({ deepModel: value })}
      />
      {provider.capabilities.supportsGrounding ? (
        <ModelField
          label="Grounded model"
          value={models.groundedModel}
          modelOptions={modelOptions ?? provider.modelOptions}
          placeholder={provider.defaultModels.groundedModel}
          onChange={(value) => onChange({ groundedModel: value })}
        />
      ) : null}
      {provider.capabilities.supportsAudioTranscription ? (
        <ModelField
          label="Transcription model"
          value={models.transcriptionModel}
          modelOptions={modelOptions ?? provider.modelOptions}
          placeholder={provider.defaultModels.transcriptionModel}
          onChange={(value) => onChange({ transcriptionModel: value })}
        />
      ) : null}
    </div>
  );
}
