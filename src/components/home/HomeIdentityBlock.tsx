interface HomeIdentityBlockProps {
  heroSrc: string;
  providerReady: boolean;
  hideMikeNotes?: boolean;
  inputSummary?: string;
}

export function HomeIdentityBlock({ heroSrc, providerReady, hideMikeNotes = false, inputSummary }: HomeIdentityBlockProps) {
  const coachNote = providerReady
    ? "Ready for classwork. Use Fast to check an answer; use Deep when you need the method, assumptions, and final answer explained."
    : "Add a provider key to unlock solving. Your draft stays here while setup opens.";
  const readinessLabel = providerReady ? "Solving ready." : "Setup required.";

  return (
    <section className="studio-panel flex flex-col gap-2.5 bg-white/84 px-3.5 py-3 dark:bg-slate-950/80 md:px-5 md:py-3.5">
      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] bg-linear-to-br from-(--aqs-accent)/10 via-white to-(--aqs-gold)/16 ring-1 ring-(--aqs-accent)/10 dark:from-(--aqs-accent)/16 dark:via-slate-950 dark:to-(--aqs-gold)/8 md:h-14 md:w-14 md:rounded-[1.35rem]">
          <img
            src={heroSrc}
            alt="Mike Answers mascot"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            className="pointer-events-none h-full w-full scale-[1.05] select-none object-contain object-bottom"
          />
          <span
            className={`absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-950 ${
              providerReady ? "bg-emerald-500" : "bg-(--aqs-accent)"
            }`}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[0.95rem] font-black leading-tight tracking-tight text-(--aqs-ink) dark:text-white sm:text-[1.1rem] md:text-[1.25rem]">
            Truth-first tutoring for hard questions.
          </h1>
          <span className="sr-only">{readinessLabel}</span>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 md:text-sm">
            {inputSummary ?? "Screenshot, text, or voice. Method before final answer."}
          </p>
        </div>
      </div>
      {!hideMikeNotes ? (
        <div className={`rounded-[1.1rem] border px-3.5 py-2.5 text-xs leading-5 ${
          providerReady
            ? "border-emerald-500/25 bg-emerald-50/80 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-950/25 dark:text-emerald-100"
            : "border-(--aqs-accent)/20 bg-(--aqs-accent-soft) text-(--aqs-ink) dark:border-(--aqs-accent-dark)/25 dark:bg-[rgba(122,31,52,0.18)] dark:text-slate-100"
        }`}>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
            Mike's Notes
          </div>
          <p className="mt-1 font-semibold">{coachNote}</p>
        </div>
      ) : null}
    </section>
  );
}
