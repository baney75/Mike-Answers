import { BookOpen, Sparkles } from "lucide-react";

interface HomeUtilityRailProps {
  starterPrompts: string[];
  onPrefillPrompt: (text: string) => void;
  onOpenDailyDesk: () => void;
}

export function HomeUtilityRail({
  starterPrompts,
  onPrefillPrompt,
  onOpenDailyDesk,
}: HomeUtilityRailProps) {
  return (
    <div className="flex min-h-0 flex-col gap-2.5 md:gap-3">
      <section className="studio-card bg-white/92 p-4 dark:bg-slate-950/82">
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--aqs-accent) text-white transition hover:bg-(--aqs-accent-strong)"
          >
            <BookOpen className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="studio-card bg-white/92 p-4 dark:bg-slate-950/82">
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
    </div>
  );
}
