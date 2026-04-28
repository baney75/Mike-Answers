import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { mikeAssetManifest } from "../assets/mike/manifest";
import { mikeLoadingArt } from "../assets/mike/loadingManifest";

const mascotSlides = [
  {
    subject: "general",
    imageSrc: mikeAssetManifest.heroes.general.webp,
    alt: "Mike mascot thinking",
    line: "Reading the problem before rushing the answer.",
    detail: "First pass: identify what is being asked.",
    fit: "object-cover",
  },
  {
    subject: "churchill",
    imageSrc: mikeLoadingArt.churchill,
    alt: "Mike mascot dressed like Winston Churchill",
    line: "Never give in. Do check the units.",
    detail: "Churchill's Harrow speech is the vibe: steady, not panicked.",
    fit: "object-contain bg-black",
  },
  {
    subject: "philosophy",
    imageSrc: mikeLoadingArt.philosophy,
    alt: "Mike mascot as a philosophy tutor",
    line: "Examining the assumptions before the conclusion.",
    detail: "Socrates would ask for definitions first.",
    fit: "object-cover",
  },
  {
    subject: "chemistry",
    imageSrc: mikeLoadingArt.chemistry,
    alt: "Mike mascot in a chemistry lab",
    line: "Checking whether the reaction makes sense.",
    detail: "No mystery green liquid conclusions without evidence.",
    fit: "object-cover",
  },
  {
    subject: "gannon",
    imageSrc: mikeLoadingArt.gannon,
    alt: "Mike mascot in a Gannon-themed study portrait",
    line: "Connecting faith, reason, and the assignment.",
    detail: "Made by a Gannon student; Mike Answers is not affiliated with Gannon University.",
    fit: "object-cover",
  },
  {
    subject: "mathematics",
    imageSrc: mikeAssetManifest.heroes.mathematics.webp,
    alt: "Mike mascot studying math",
    line: "Finding the first step that makes the rest easier.",
    detail: "Method first, answer second.",
    fit: "object-cover",
  },
] as const;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LoadingState() {
  const [index, setIndex] = useState(() => Math.floor(Date.now() / 2800) % mascotSlides.length);
  const slide = mascotSlides[index] ?? mascotSlides[0];
  const imageSrc = useMemo(() => slide.imageSrc, [slide.imageSrc]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      return;
    }
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % mascotSlides.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="paper-panel flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-white/82 px-6 py-8 animate-in fade-in duration-500 no-print dark:bg-slate-950/78"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative mb-5 flex w-full max-w-sm justify-center">
        <div className="absolute inset-x-8 bottom-3 h-20 rounded-full bg-(--aqs-accent)/14 blur-2xl dark:bg-(--aqs-accent-dark)/20" />
        <div className="relative aspect-square h-42 max-h-[38dvh] overflow-hidden rounded-4xl border border-(--aqs-ink)/10 bg-(--aqs-paper-strong) shadow-[0_18px_45px_rgba(37,27,31,0.16)] dark:border-white/10 dark:bg-slate-900 sm:h-48">
          <img
            key={slide.subject}
            src={imageSrc}
            alt={slide.alt}
            className={`h-full w-full animate-in fade-in zoom-in-95 duration-500 motion-reduce:animate-none ${slide.fit}`}
          />
          <div className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <Loader2 className="h-5 w-5 animate-spin text-(--aqs-accent) motion-reduce:animate-none" />
          </div>
        </div>
      </div>
      <h2 className="text-lg font-black tracking-tight text-(--aqs-ink) dark:text-white">
        Mike is working on it...
      </h2>
      <p className="mt-2 max-w-sm text-center text-sm font-semibold leading-6 text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
        {slide.line}
      </p>
      <p className="mt-2 max-w-sm text-center text-xs font-medium leading-6 text-slate-500 dark:text-slate-400">
        {slide.detail}
      </p>
    </div>
  );
}
