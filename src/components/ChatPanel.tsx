import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, PencilLine, RefreshCw, Send, X } from "lucide-react";

import type { ChatMessage } from "../types";
import { RichResponse } from "./RichResponse";
import { resizeImage } from "../utils/image";

interface FollowUpPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string, imageBase64?: string) => Promise<boolean>;
  onRetryLast: () => Promise<boolean>;
  lastUserMessage: string | null;
  contextText?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  prefillText?: { id: number; text: string } | null;
  onConsumePrefill?: () => void;
  starterPrompts?: string[];
  onEscape?: () => void;
}

interface FollowUpTranscriptProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

interface FollowUpDockProps extends Omit<FollowUpPanelProps, "messages"> {
  messages: ChatMessage[];
}

function cleanSuggestionLabel(suggestion: string) {
  return suggestion
    .replace(/\s+/g, " ")
    .replace(/[.。]\s*$/, "")
    .trim();
}

function isTutorFailureMessage(text: string) {
  return /^Sorry, I couldn't process that right now\./i.test(text.trim()) ||
    /A configured provider is needed before .* chat can run\./i.test(text.trim());
}

function TutorMessage({ text }: { text: string }) {
  return <RichResponse text={text} compact />;
}

function useFollowUpGuidance(messages: ChatMessage[], contextText: string | undefined, starterPrompts: string[]) {
  const latestTutorMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "tutor")?.text ?? "",
    [messages],
  );
  const guidanceText = latestTutorMessage || contextText || "";

  const followUpSuggestions = useMemo(() => {
    const numberedChoices = [...guidanceText.matchAll(/(?:^|\n)\s*\d+\.\s+(.+?)(?=(?:\n\s*\d+\.\s+)|$)/g)]
      .map((match) => cleanSuggestionLabel(match[1] ?? ""))
      .filter((value): value is string => Boolean(value));

    return numberedChoices.slice(0, 4);
  }, [guidanceText]);

  const isClarificationMode = useMemo(
    () =>
      /\b(clarify|specific question|specific task|what would you like me to do|what do you want me to do|provide more details?|give me more details?|test my abilities)\b/i.test(
        guidanceText,
      ),
    [guidanceText],
  );

  const visibleSuggestions = useMemo(
    () => (followUpSuggestions.length > 0 ? followUpSuggestions : starterPrompts).slice(0, 3),
    [followUpSuggestions, starterPrompts],
  );

  return {
    isClarificationMode,
    visibleSuggestions,
  };
}

export function FollowUpTranscript({ messages, isLoading }: FollowUpTranscriptProps) {
  const turnCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages],
  );

  return (
    <section className="print-follow-up-transcript flex min-h-64 max-h-[min(38vh,26rem)] flex-col overflow-hidden rounded-[1.9rem] border border-(--aqs-ink)/10 bg-white/90 shadow-[0_18px_38px_rgba(34,24,29,0.08)] dark:border-white/10 dark:bg-slate-950/74 print:max-h-none">
      <div className="flex flex-col gap-3 border-b border-(--aqs-ink)/10 bg-[linear-gradient(180deg,rgba(255,241,244,0.96),rgba(255,252,251,0.94))] px-5 py-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(100,17,42,0.36),rgba(12,11,13,0.82))] md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
              Continue Learning
            </p>
            <h3 className="text-xl font-black tracking-tight text-(--aqs-ink) dark:text-white">
              Keep learning from the same answer.
            </h3>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Ask for the next step, check your work, or test the idea against Scripture, sources, and reason.
            </p>
          </div>

          {turnCount > 0 ? (
            <span className="rounded-full border border-(--aqs-ink)/10 bg-white/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
              {turnCount} turn{turnCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="scroll-panel min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
        {messages.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-(--aqs-accent)/20 bg-(--aqs-paper-strong) px-6 py-10 text-center dark:bg-slate-950/28">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
              Ask for the next move
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Check the weak step, explain the concept again, or apply the answer without losing the thread.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[96%] rounded-[1.25rem] border px-4 py-3.5 md:max-w-[86%] ${
                    message.role === "user"
                      ? "border-(--aqs-accent)/16 bg-(--aqs-accent-soft) text-(--aqs-ink) dark:border-(--aqs-accent-dark)/16 dark:bg-[rgba(139,30,63,0.22)] dark:text-white"
                      : isTutorFailureMessage(message.text)
                        ? "border-(--aqs-accent)/20 bg-(--aqs-accent-soft) text-(--aqs-ink)"
                        : "border-(--aqs-ink)/8 bg-(--aqs-paper-strong) text-(--aqs-ink) dark:border-white/8 dark:bg-slate-900 dark:text-white"
                  }`}
                >
                  <p className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {message.role === "user" ? "You" : isTutorFailureMessage(message.text) ? "System" : "Tutor"}
                  </p>
                  {message.role === "user" ? (
                    <div className="space-y-2">
                      <p className="wrap-break-word whitespace-pre-wrap text-[14px] font-medium leading-relaxed md:text-[15px]">
                        {message.text}
                      </p>
                      {message.imageBase64 ? (
                        <div className="max-w-[260px] overflow-hidden rounded-xl border border-(--aqs-ink)/10 bg-white/60 dark:border-white/10 dark:bg-slate-950/60">
                          <img
                            src={`data:image/jpeg;base64,${message.imageBase64}`}
                            alt="Attached image"
                            className="h-auto w-full cursor-pointer object-contain transition hover:scale-[1.02] active:scale-[0.98]"
                            loading="lazy"
                            onClick={() => {
                              const img = document.createElement("img");
                              img.src = `data:image/jpeg;base64,${message.imageBase64}`;
                              const overlay = document.createElement("div");
                              overlay.className = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 cursor-pointer";
                              overlay.onclick = () => overlay.remove();
                              img.className = "max-h-[90dvh] max-w-[90vw] rounded-2xl shadow-2xl object-contain";
                              overlay.appendChild(img);
                              document.body.appendChild(overlay);
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : isTutorFailureMessage(message.text) ? (
                    <p className="text-[14px] font-medium leading-relaxed md:text-[15px]">{message.text}</p>
                  ) : (
                    <TutorMessage text={message.text} />
                  )}
                </div>
              </div>
            ))}

            {isLoading ? (
              <div className="print:hidden">
                <div className="flex items-center gap-1.5 rounded-full border border-(--aqs-ink)/8 bg-white px-4 py-2.5 dark:border-white/8 dark:bg-slate-900">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--aqs-accent)" style={{ animationDelay: "0ms" }} />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--aqs-accent)" style={{ animationDelay: "150ms" }} />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--aqs-accent)" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

export function FollowUpDock({
  messages,
  isLoading,
  onSend,
  onRetryLast,
  lastUserMessage,
  contextText,
  inputRef,
  prefillText,
  onConsumePrefill,
  starterPrompts = [],
  onEscape,
}: FollowUpDockProps) {
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const effectiveInputRef = inputRef ?? internalInputRef;

  const { isClarificationMode, visibleSuggestions } = useFollowUpGuidance(messages, contextText, starterPrompts);

  useEffect(() => {
    if (!prefillText?.text) {
      return;
    }

    setInput((current) => `${current}${prefillText.text}`);
    effectiveInputRef.current?.focus();
    onConsumePrefill?.();
  }, [effectiveInputRef, onConsumePrefill, prefillText]);

  const handleSuggestion = async (suggestion: string) => {
    setInput(suggestion);
    effectiveInputRef.current?.focus();
  };

  const handleAttachImage = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    setAttaching(true);
    try {
      const base64 = await resizeImage(file, { maxDimension: 1200, quality: 0.8 });
      setAttachedImage(base64);
    } finally {
      setAttaching(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleAttachImage(file);
      }
      event.target.value = "";
    },
    [handleAttachImage],
  );

  const removeAttachedImage = useCallback(() => {
    setAttachedImage(null);
  }, []);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedImage) || isLoading) {
      return;
    }

    const success = await onSend(trimmed, attachedImage ?? undefined);
    if (success) {
      setInput("");
      setAttachedImage(null);
    }
  };

  const handlePanelEscape = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (input.trim()) {
      setInput("");
      return;
    }

    if (document.activeElement instanceof HTMLElement && panelRef.current?.contains(document.activeElement)) {
      document.activeElement.blur();
      return;
    }

    onEscape?.();
  };

  return (
    <div
      ref={panelRef}
      data-chat-panel="true"
      onKeyDownCapture={handlePanelEscape}
      className="no-print paper-panel flex shrink-0 flex-col gap-3 p-4 md:p-5"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-(--aqs-accent-strong)">
            Follow-up
          </p>
          <p className="mt-1 hidden text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:block">
            Ask for the next step, a work check, or a clearer explanation.
          </p>
        </div>
      </div>

      {visibleSuggestions.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                void handleSuggestion(suggestion);
              }}
              className="shrink-0 rounded-full border border-(--aqs-ink)/8 bg-white px-3.5 py-2 text-xs font-black text-(--aqs-ink) transition hover:border-(--aqs-accent)/20 hover:bg-slate-50 dark:border-white/8 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-[1.35rem] border border-(--aqs-ink)/10 bg-white p-2.5 dark:border-white/10 dark:bg-slate-900">
        {attachedImage ? (
          <div className="relative mb-2 inline-block max-w-[140px] rounded-xl border border-(--aqs-ink)/10 bg-slate-50/80 p-1 dark:border-white/10 dark:bg-slate-950/60">
            <img
              src={`data:image/jpeg;base64,${attachedImage}`}
              alt="Attached preview"
              className="h-auto w-full max-h-20 rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={removeAttachedImage}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-(--aqs-accent) text-white shadow-sm transition hover:bg-(--aqs-accent-strong)"
              aria-label="Remove attached image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <textarea
            id="follow-up-input"
            ref={effectiveInputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            rows={1}
            className="min-h-[2.9rem] max-h-28 flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] font-medium leading-snug text-(--aqs-ink) outline-none placeholder:text-slate-400 dark:text-white"
            disabled={isLoading}
            placeholder={
              isClarificationMode
                ? "Paste the exact problem..."
                : "Ask for the next step, a work check, or a clearer explanation..."
            }
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || attaching}
            aria-label="Attach image"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--aqs-ink)/10 bg-white text-(--aqs-ink) transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            <ImagePlus className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={(!input.trim() && !attachedImage) || isLoading || attaching}
            aria-label="Send follow-up"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--aqs-accent) text-white transition-all hover:bg-(--aqs-accent-strong) disabled:opacity-40"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {lastUserMessage ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void onRetryLast();
            }}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[0.95rem] border border-(--aqs-ink)/8 bg-white py-2.5 text-xs font-black text-(--aqs-ink) transition disabled:opacity-40 dark:border-white/8 dark:bg-slate-900 dark:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5 text-(--aqs-accent)" />
            Retry last turn
          </button>
          <button
            type="button"
            onClick={() => setInput(lastUserMessage)}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[0.95rem] border border-(--aqs-ink)/8 bg-white py-2.5 text-xs font-black text-(--aqs-ink) transition disabled:opacity-40 dark:border-white/8 dark:bg-slate-900 dark:text-white"
          >
            <PencilLine className="h-3.5 w-3.5 text-(--aqs-gold)" />
            Edit the question
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ChatPanel(props: FollowUpPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-4">
      <FollowUpTranscript messages={props.messages} isLoading={props.isLoading} />
      <FollowUpDock {...props} />
    </div>
  );
}
