import { Search, Check } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import type { OpenRouterModelSummary, ProviderModelOption, ProviderModelProfile, ProviderDescriptor } from "../../types";

function SearchableModelSelect({
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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOpenRouter = Boolean(options && options.length > 0);

  const filteredOptions = useMemo(() => {
    if (isOpenRouter) {
      if (!query.trim()) return options ?? [];
      const q = query.toLowerCase();
      return (options ?? []).filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.description ?? "").toLowerCase().includes(q),
      );
    }
    if (!modelOptions || modelOptions.length === 0) return [];
    if (!query.trim()) return modelOptions;
    const q = query.toLowerCase();
    return modelOptions.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.note ?? "").toLowerCase().includes(q),
    );
  }, [query, options, modelOptions, isOpenRouter]);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    if (isOpenRouter) {
      const found = (options ?? []).find((m) => m.id === value);
      return found ? found.name : value;
    }
    const found = (modelOptions ?? []).find((m) => m.id === value);
    return found ? found.label : value;
  }, [value, options, modelOptions, isOpenRouter]);

  const selectedNote = useMemo(() => {
    if (!value) return "";
    if (isOpenRouter) return "";
    const found = (modelOptions ?? []).find((m) => m.id === value);
    return found?.note ?? "";
  }, [value, modelOptions, isOpenRouter]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
    }
  }, [open]);

  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={open ? query : selectedLabel}
            onFocus={() => setOpen(true)}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={open ? "Search models..." : (placeholder ?? "Select a model")}
            className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white py-3 pl-9 pr-10 text-sm text-(--aqs-ink) outline-none transition placeholder:text-slate-400 focus:border-(--aqs-accent) focus:ring-4 focus:ring-[rgba(122,31,52,0.12)] dark:border-white/10 dark:bg-slate-900 dark:text-white"
          />
          {value && !open ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs leading-none text-slate-400">
              {isOpenRouter
                ? (options ?? []).find((m) => m.id === value)?.supportsImages
                  ? "\uD83D\uDCF7"
                  : ""
                : (modelOptions ?? []).find((m) => m.id === value)?.supportsImages
                  ? "\uD83D\uDCF7"
                  : ""}
            </span>
          ) : null}
        </div>
        {open ? (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-(--aqs-ink)/10 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-(--aqs-paper-strong) dark:hover:bg-slate-800 ${
                !value ? "bg-(--aqs-accent-soft)/60 font-semibold text-(--aqs-accent-strong) dark:bg-[rgba(122,31,52,0.2)] dark:text-(--aqs-accent-dark)" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <span className="flex-1">Auto-pick recommended model</span>
              {!value ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No models match your search</div>
            ) : (
              filteredOptions.map((model) => {
                const modelId = "id" in model ? model.id : model.id;
                const modelLabel = isOpenRouter
                  ? (model as OpenRouterModelSummary).name
                  : (model as ProviderModelOption).label;
                const supportsImg = isOpenRouter
                  ? (model as OpenRouterModelSummary).supportsImages
                  : (model as ProviderModelOption).supportsImages;
                const modelNote = isOpenRouter
                  ? (model as OpenRouterModelSummary).description
                  : (model as ProviderModelOption).note;
                const isSelected = value === modelId;
                return (
                  <button
                    key={modelId}
                    type="button"
                    onClick={() => {
                      onChange(modelId);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-3 border-t border-(--aqs-ink)/6 px-4 py-3 text-left text-sm transition hover:bg-(--aqs-paper-strong) dark:border-white/6 dark:hover:bg-slate-800 ${
                      isSelected ? "bg-(--aqs-accent-soft)/40 dark:bg-[rgba(122,31,52,0.15)]" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-center gap-2 ${isSelected ? "font-semibold text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)" : "text-(--aqs-ink) dark:text-white"}`}>
                        <span className="truncate">{modelLabel}</span>
                        {supportsImg ? <span className="shrink-0 text-xs" title="Supports images">\uD83D\uDCF7</span> : null}
                        {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-(--aqs-accent)" /> : null}
                      </div>
                      {modelNote ? (
                        <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {modelNote}
                        </div>
                      ) : null}
                    </div>
                    <span className="mt-0.5 shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      {modelId.length > 30 ? modelId.slice(0, 28) + "..." : modelId}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
      {selectedNote && !open ? (
        <span className="block text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
          {selectedNote}
        </span>
      ) : null}
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
      <SearchableModelSelect
        label="Fast model"
        value={models.fastModel}
        options={usesCatalog ? openrouterModels : undefined}
        modelOptions={!usesCatalog ? modelOptions ?? provider.modelOptions : undefined}
        placeholder={provider.defaultModels.fastModel}
        onChange={(value) => onChange({ fastModel: value })}
      />
      <SearchableModelSelect
        label="Deep model"
        value={models.deepModel}
        options={usesCatalog ? openrouterModels : undefined}
        modelOptions={!usesCatalog ? modelOptions ?? provider.modelOptions : undefined}
        placeholder={provider.defaultModels.deepModel}
        onChange={(value) => onChange({ deepModel: value })}
      />
      {provider.capabilities.supportsGrounding ? (
        <SearchableModelSelect
          label="Grounded model"
          value={models.groundedModel}
          modelOptions={modelOptions ?? provider.modelOptions}
          placeholder={provider.defaultModels.groundedModel}
          onChange={(value) => onChange({ groundedModel: value })}
        />
      ) : null}
      {provider.capabilities.supportsAudioTranscription ? (
        <SearchableModelSelect
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
