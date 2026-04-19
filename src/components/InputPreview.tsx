import React, { useEffect, useRef } from "react";
import { BrainCircuit, X, Zap } from "lucide-react";
import type { SolveMode } from "../types";
import { shouldSubmitTextShortcut } from "../utils/input";

interface InputPreviewProps {
  imagePreviewUrl: string | null;
  textInput: string | null;
  onTextChange: (text: string) => void;
  onSolve: (mode: SolveMode) => void;
  onClear: () => void;
}

const BTN_BASE =
  "flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition sm:w-auto";

export function InputPreview({
  imagePreviewUrl,
  textInput,
  onTextChange,
  onSolve,
  onClear,
}: InputPreviewProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textInput || imagePreviewUrl) {
      return;
    }

    const timer = window.setTimeout(() => {
      textAreaRef.current?.focus();
      const value = textAreaRef.current?.value ?? "";
      textAreaRef.current?.setSelectionRange(value.length, value.length);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [imagePreviewUrl, textInput]);

  return (
    <div className="no-print paper-panel flex h-full min-h-0 flex-col overflow-hidden p-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b-2 border-(--aqs-border) bg-(--aqs-paper-strong) p-4 dark:bg-slate-900/40 md:p-5">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
          Input review
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="neo-border-thin neo-shadow-sm flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all hover:bg-slate-50 active:translate-y-px dark:bg-slate-950 dark:hover:bg-slate-900"
          title="Clear input"
        >
          <X className="h-5 w-5 text-(--aqs-accent)" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
        {imagePreviewUrl && (
          <div className="flex min-h-0 w-full flex-1 flex-col space-y-4 overflow-hidden">
            <div className="neo-border-thin neo-shadow-sm overflow-hidden rounded-[2rem] bg-white p-2 dark:bg-slate-950">
              <img
                src={imagePreviewUrl}
                alt="Question preview"
                className="max-h-[min(34dvh,24rem)] w-full object-contain rounded-[1.6rem]"
              />
            </div>
            <p className="text-center text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Mike will inspect the image first. If your work is already shown, it will be validated before corrections.
            </p>
          </div>
        )}
        {textInput !== null && !imagePreviewUrl && (
          <div className="flex min-h-0 w-full flex-1 flex-col space-y-4">
            <div className="neo-border-thin rounded-[2rem] bg-white p-1 focus-within:ring-4 focus-within:ring-[color:rgba(139,30,63,0.08)] dark:bg-slate-950">
              <textarea
                ref={textAreaRef}
                value={textInput}
                onChange={(event) => onTextChange(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    shouldSubmitTextShortcut({
                      isComposing: event.nativeEvent.isComposing,
                      key: event.key,
                      shiftKey: event.shiftKey,
                    })
                  ) {
                    event.preventDefault();
                    onSolve("fast");
                  }
                }}
                placeholder="Type or paste your question here."
                className="h-[min(42dvh,22rem)] min-h-[12rem] w-full resize-none rounded-[1.8rem] bg-transparent px-4 py-4 text-base font-medium leading-relaxed text-(--aqs-ink) outline-none placeholder:text-slate-400 dark:text-white md:px-6 md:py-6 md:text-lg"
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex w-full shrink-0 flex-col items-center gap-4 md:mt-6">
          <div className="flex w-full flex-col justify-center gap-5 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => onSolve("fast")}
              className="neo-border neo-shadow flex flex-1 items-center justify-center gap-3 rounded-2xl bg-(--aqs-accent) px-6 py-4 text-base font-black text-white transition-all hover:bg-(--aqs-accent-strong) active:translate-y-px active:shadow-none sm:max-w-[280px] md:px-8 md:py-5 md:text-lg"
            >
              <Zap className="h-6 w-6 text-(--aqs-gold)" />
              Mike Fast
            </button>
            <button
              type="button"
              onClick={() => onSolve("deep")}
              className="neo-border-thin neo-shadow-sm flex flex-1 items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-base font-black text-(--aqs-ink) transition-all hover:bg-slate-50 active:translate-y-px active:shadow-none dark:bg-slate-900 dark:text-white dark:hover:bg-slate-900 sm:max-w-[280px] md:px-8 md:py-5 md:text-lg"
            >
              <BrainCircuit className="h-6 w-6 text-(--aqs-accent)" />
              Mike Deep
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
