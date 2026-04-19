interface HomeIdentityBlockProps {
  heroSrc: string;
}

export function HomeIdentityBlock({ heroSrc }: HomeIdentityBlockProps) {
  return (
    <section className="studio-panel flex items-center gap-3 bg-white/84 px-3.5 py-3 dark:bg-slate-950/80 md:px-5 md:py-3.5">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] bg-linear-to-br from-(--aqs-accent)/8 via-white to-(--aqs-gold)/14 ring-1 ring-(--aqs-accent)/10 dark:from-(--aqs-accent)/16 dark:via-slate-950 dark:to-(--aqs-gold)/8 md:h-13 md:w-13 md:rounded-[1.2rem]">
        <img
          src={heroSrc}
          alt="Mike Answers subject stamp"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          className="pointer-events-none h-full w-full scale-[1.05] select-none object-contain object-bottom"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-[0.95rem] font-black leading-tight tracking-tight text-(--aqs-ink) dark:text-white sm:text-[1.1rem] md:text-[1.25rem]">
          Ask anything. Screenshot, text, or voice.
        </h1>
        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 md:text-sm">
          Enter sends Fast. Shift+Enter for Deep.
        </p>
      </div>
    </section>
  );
}
