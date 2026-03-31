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
    <div className="no-print paper-panel overflow-hidden p-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b-2 border-[var(--aqs-border)] bg-[var(--aqs-paper-strong)] p-5 dark:bg-slate-900/40">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
          Input review
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="neo-border-thin neo-shadow-sm flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all hover:-translate-y-0.5 active:translate-y-px dark:bg-slate-950"
          title="Clear input"
        >
          <X className="h-5 w-5 text-[var(--aqs-accent)]" />
        </button>
      </div>

      <div className="flex flex-col items-center p-6 md:p-8">
        {imagePreviewUrl && (
          <div className="w-full space-y-6">
            <div className="neo-border-thin neo-shadow-sm overflow-hidden rounded-[2rem] bg-white p-2 dark:bg-slate-950">
              <img
                src={imagePreviewUrl}
                alt="Question preview"
                className="max-h-[480px] w-full object-contain rounded-[1.6rem]"
              />
            </div>
            <p className="text-center text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Mike will inspect the image first. If your work is already shown, it will be validated before corrections.
            </p>
          </div>
        )}
        {textInput !== null && !imagePreviewUrl && (
          <div className="w-full space-y-4">
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
                className="min-h-[220px] w-full resize-y rounded-[1.8rem] bg-transparent px-6 py-6 text-lg font-medium leading-relaxed text-[var(--aqs-ink)] outline-none placeholder:text-slate-400 dark:text-white md:min-h-[280px]"
              />
            </div>
          </div>
        )}

        <div className="mt-10 flex w-full flex-col items-center gap-6">
          <div className="flex w-full flex-col justify-center gap-5 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => onSolve("fast")}
              className="neo-border neo-shadow flex flex-1 items-center justify-center gap-3 rounded-2xl bg-[var(--aqs-accent)] px-8 py-5 text-lg font-black text-white transition-all hover:-translate-y-1 active:translate-y-px active:shadow-none sm:max-w-[280px]"
            >
              <Zap className="h-6 w-6 text-[var(--aqs-gold)] fill-[var(--aqs-gold)]" />
              Ask Fast
            </button>
            <button
              type="button"
              onClick={() => onSolve("deep")}
              className="neo-border-thin neo-shadow-sm flex flex-1 items-center justify-center gap-3 rounded-2xl bg-white px-8 py-5 text-lg font-black text-[var(--aqs-ink)] transition-all hover:-translate-y-1 active:translate-y-px active:shadow-none dark:bg-slate-900 dark:text-white sm:max-w-[280px]"
            >
              <BrainCircuit className="h-6 w-6 text-[var(--aqs-accent)]" />
              Deep Walkthrough
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
