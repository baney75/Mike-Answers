import { BookOpen, Sparkles } from "lucide-react";

interface HomeUtilityRailProps {
  starterPrompts: string[];
  onPrefillPrompt: (text: string) => void;
  onOpenDailyDesk: () => void;
  providerStatus: string;
  freeModeEnabled: boolean;
  legalAccepted: boolean;
}

export function HomeUtilityRail({
  starterPrompts,
  onPrefillPrompt,
  onOpenDailyDesk,
  providerStatus,
  freeModeEnabled,
  legalAccepted,
}: HomeUtilityRailProps) {
  return (
    <div className="flex min-h-0 flex-col gap-2.5 md:gap-3">
      {/* Mobile: compact horizontal strip */}
      <div className="flex items-center gap-2 xl:hidden">
        <button
          type="button"
          onClick={onOpenDailyDesk}
          className="studio-card flex items-center gap-2 bg-white/92 px-3 py-2.5 text-xs font-black text-(--aqs-ink) dark:bg-slate-950/82 dark:text-white"
        >
          <BookOpen className="h-3.5 w-3.5 text-(--aqs-accent)" />
          Daily Desk
        </button>
        {starterPrompts.slice(0, 2).map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrefillPrompt(prompt)}
            aria-label={prompt}
            className="studio-card min-w-0 flex-1 truncate bg-white/92 px-3 py-2.5 text-left text-xs font-semibold text-(--aqs-ink) dark:bg-slate-950/82 dark:text-white"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Desktop: full card layout in sidebar */}
      <section className="studio-card hidden bg-white/92 p-4 xl:block dark:bg-slate-950/82">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
              Daily Desk
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              Word, verse, and the lead headline.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenDailyDesk}
            aria-label="Open Daily Desk"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--aqs-accent) text-white transition hover:bg-(--aqs-accent-strong)"
          >
            <BookOpen className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="studio-card hidden bg-white/92 p-4 xl:block dark:bg-slate-950/82">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-(--aqs-gold)" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Try one
          </p>
        </div>
        <div className="mt-3 space-y-1.5">
          {starterPrompts.slice(0, 3).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPrefillPrompt(prompt)}
              className="w-full rounded-[0.9rem] border border-(--aqs-ink)/8 bg-(--aqs-paper-strong) px-3 py-2.5 text-left text-sm font-semibold leading-snug text-(--aqs-ink) transition hover:border-(--aqs-accent)/24 hover:bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="studio-card hidden bg-white/92 p-4 xl:block dark:bg-slate-950/82">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
          Trust and policy
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
          Mode: <strong className="text-(--aqs-ink) dark:text-white">{providerStatus}</strong>
        </p>
        <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
          {freeModeEnabled
            ? legalAccepted
              ? "Free mode is active with legal notice acknowledged. BYOK is still recommended for best quality."
              : "Free mode is selected but legal acknowledgement is missing."
            : "BYOK mode is preferred for higher quality and stable quotas."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <a
            href="https://github.com/baney75/Mike-Answers/blob/main/LEGAL_SAFETY.md"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-(--aqs-ink)/12 bg-(--aqs-paper-strong) px-3 py-1.5 text-(--aqs-ink) transition hover:border-(--aqs-accent)/30 dark:border-white/10 dark:bg-slate-900 dark:text-white"
          >
            Safety
          </a>
          <a
            href="https://github.com/baney75/Mike-Answers/blob/main/README.md#legal-and-safety"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-(--aqs-ink)/12 bg-(--aqs-paper-strong) px-3 py-1.5 text-(--aqs-ink) transition hover:border-(--aqs-accent)/30 dark:border-white/10 dark:bg-slate-900 dark:text-white"
          >
            Privacy
          </a>
        </div>
      </section>
    </div>
  );
}
