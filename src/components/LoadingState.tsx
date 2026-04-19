import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="paper-panel flex h-full min-h-0 flex-col items-center justify-center bg-white/82 px-6 py-10 animate-in fade-in duration-500 no-print dark:bg-slate-950/78">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-(--aqs-accent)/12 blur-xl" />
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-(--aqs-ink)/10 bg-white dark:border-white/10 dark:bg-slate-900">
          <Loader2 className="h-9 w-9 animate-spin text-(--aqs-accent)" />
        </div>
      </div>
      <h2 className="text-lg font-black tracking-tight text-(--aqs-ink) dark:text-white">
        Working on it...
      </h2>
      <p className="mt-2 max-w-sm text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        Mike is reading the question, choosing the right approach, and building the answer.
      </p>
    </div>
  );
}
