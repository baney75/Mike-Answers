import { Loader2, Sparkles } from "lucide-react";

export function LoadingState() {
  return (
    <div className="paper-panel flex flex-col items-center justify-center py-16 animate-in fade-in duration-500 no-print">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-[var(--aqs-accent)]/20" />
        <div className="neo-border-thin neo-shadow-sm flex h-24 w-24 items-center justify-center rounded-full bg-white dark:bg-slate-900">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--aqs-accent)]" />
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-3">
        <span className="patch flex items-center gap-2 px-4 py-1.5 text-sm">
          <Sparkles className="h-4 w-4" />
          Thinking Deeply
        </span>
        <h2 className="text-3xl font-black tracking-tight text-[var(--aqs-ink)] dark:text-white">
          Analyzing your question...
        </h2>
        <p className="max-w-md text-center text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          Mike is inspecting the evidence and preparing a step-by-step walkthrough. This usually takes 3–8 seconds.
        </p>
      </div>
    </div>
  );
}
