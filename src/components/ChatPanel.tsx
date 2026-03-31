import { useMemo, useState, useRef } from "react";
import { MessageSquare, PencilLine, RefreshCw, Send, Sparkles } from "lucide-react";

import type { ChatMessage } from "../types";
import { RichResponse } from "./RichResponse";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => Promise<boolean>;
  onRetryLast: () => Promise<boolean>;
  lastUserMessage: string | null;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  starterPrompts?: string[];
}

function TutorMessage({ text }: { text: string }) {
  return <RichResponse text={text} compact />;
}

function describeSuggestion(suggestion: string) {
  if (/watch for|video/i.test(suggestion)) {
    return "Focus the media instead of re-asking the whole problem.";
  }
  if (/next step|on my own/i.test(suggestion)) {
    return "Keep momentum without revealing everything at once.";
  }
  if (/mistake|check/i.test(suggestion)) {
    return "Use this to catch reasoning errors before they compound.";
  }
  if (/study guide|review/i.test(suggestion)) {
    return "Turn the answer into something you can actually reuse later.";
  }
  if (/simpler|plain|jargon/i.test(suggestion)) {
    return "Compress the explanation into cleaner language.";
  }
  if (/compare/i.test(suggestion)) {
    return "See where the media and written method line up or diverge.";
  }

  return "A strong follow-up that pushes the answer forward.";
}

function cleanSuggestionLabel(suggestion: string) {
  return suggestion
    .replace(/\s+/g, " ")
    .replace(/[.。]\s*$/, "")
    .trim();
}

export function ChatPanel({
  messages,
  isLoading,
  onSend,
  onRetryLast,
  lastUserMessage,
  inputRef,
  starterPrompts = [],
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const effectiveInputRef = inputRef ?? internalInputRef;
  const latestTutorMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "tutor")?.text ?? "",
    [messages],
  );
  const followUpSuggestions = useMemo(() => {
    const numberedChoices = [...latestTutorMessage.matchAll(/(?:^|\n)\s*\d+\.\s+(.+?)(?=(?:\n\s*\d+\.\s+)|$)/g)]
      .map((match) => cleanSuggestionLabel(match[1] ?? ""))
      .filter((value): value is string => Boolean(value));

    if (numberedChoices.length > 0) {
      return numberedChoices.slice(0, 4);
    }

    return [];
  }, [latestTutorMessage]);
  const visibleSuggestions = followUpSuggestions.length > 0
    ? followUpSuggestions
    : starterPrompts.length > 0
      ? starterPrompts
      : [
          "Explain that in simpler words.",
          "Show me the next step only.",
          "Check whether my reasoning is right.",
          "Turn this into a short study guide.",
        ];

  const handleSuggestion = async (suggestion: string) => {
    setInput(suggestion);
    effectiveInputRef.current?.focus();

    if (followUpSuggestions.length > 0 && !isLoading) {
      const success = await onSend(suggestion);
      if (success) {
        setInput("");
      }
    }
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    const success = await onSend(trimmed);
    if (success) {
      setInput("");
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

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && panelRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
  };

  const isTutorFailureMessage = (text: string) =>
    /^Sorry, I couldn't process that right now\./i.test(text.trim());

  return (
    <div
      ref={panelRef}
      data-chat-panel="true"
      onKeyDownCapture={handlePanelEscape}
      className="no-print paper-panel overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b-2 border-[var(--aqs-border)] bg-[var(--aqs-paper-strong)] p-5 dark:bg-slate-900/40">
        <div className="flex items-start gap-4">
          <div className="patch flex h-10 w-10 items-center justify-center p-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--aqs-ink)] dark:text-white">
              Follow-up Tutor
            </h3>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
              Keep the thread tied to the current problem. Ask for the next step, a check, or a cleaner explanation.
            </p>
          </div>
        </div>
        <span className="patch px-4">
          {messages.length} turn{messages.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[minmax(0,1.45fr)_380px] xl:items-start">
        <section className="min-w-0 space-y-6">
          <div className="neo-border-thin flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--aqs-paper)] px-5 py-4 dark:bg-slate-950/40">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                Conversation Workspace
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                {followUpSuggestions.length > 0
                  ? "The tutor is asking for a specific clarification. Pick one or answer directly."
                  : "Short, specific follow-ups work best here."}
              </p>
            </div>
          </div>

          {messages.length > 0 ? (
            <div className="scroll-panel space-y-6 overflow-y-auto rounded-[2rem] border-2 border-[var(--aqs-border)] bg-[var(--aqs-paper-strong)] p-5 dark:bg-slate-950/20 md:max-h-[640px]">
              {messages.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[95%] rounded-[1.8rem] border-2 p-5 neo-shadow-sm md:max-w-[88%] ${
                      msg.role === "user"
                        ? "border-[var(--aqs-border)] bg-[var(--aqs-accent-soft)] text-[var(--aqs-ink)] dark:bg-[color:rgba(139,30,63,0.25)] dark:text-white"
                        : isTutorFailureMessage(msg.text)
                          ? "border-[var(--aqs-accent)] bg-[var(--aqs-accent-soft)] text-[var(--aqs-ink)]"
                          : "border-[var(--aqs-border)] bg-white text-[var(--aqs-ink)] dark:bg-slate-900 dark:text-white"
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="patch text-[9px]">
                        {msg.role === "user" ? "You" : isTutorFailureMessage(msg.text) ? "System" : "Tutor"}
                      </span>
                    </div>
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap break-words text-[16px] font-medium leading-relaxed">{msg.text}</p>
                    ) : isTutorFailureMessage(msg.text) ? (
                      <div className="space-y-4">
                        <p className="text-[16px] font-medium leading-relaxed">{msg.text}</p>
                        <div className="neo-border-thin rounded-xl bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 dark:bg-gray-900/60 dark:text-slate-300">
                          Try answering the clarification directly, or use one of the prompt cards on the right.
                        </div>
                      </div>
                    ) : (
                      <TutorMessage text={msg.text} />
                    )}
                  </div>
                </div>
              ))}

              {isLoading ? (
                <div className="flex justify-start">
                  <div className="neo-border-thin neo-shadow-sm flex items-center gap-2 rounded-full bg-white px-5 py-3 dark:bg-slate-900">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--aqs-accent)]" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--aqs-accent)]" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--aqs-accent)]" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="neo-border neo-shadow-sm rounded-[2rem] bg-white p-6 dark:bg-slate-950">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)]">
                <div className="space-y-6">
                  <div>
                    <span className="patch">Start Strong</span>
                    <h4 className="mt-4 text-2xl font-black text-[var(--aqs-ink)] dark:text-white">
                      Ask for one useful next move.
                    </h4>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                      The best follow-up is narrow and concrete: ask for the next step, a correction, or what to watch for in the media above.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visibleSuggestions.slice(0, 4).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void handleSuggestion(suggestion)}
                        className="neo-border-thin neo-shadow-sm flex flex-col items-start rounded-2xl bg-[var(--aqs-paper)] p-5 text-left transition-all hover:-translate-y-1 active:translate-y-px dark:bg-slate-900"
                      >
                        <p className="text-[15px] font-black leading-snug text-[var(--aqs-ink)] dark:text-white">
                          {suggestion}
                        </p>
                        <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--aqs-accent)] opacity-60">
                          {describeSuggestion(suggestion)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="neo-border-thin rounded-[1.8rem] bg-[var(--aqs-paper-strong)] p-5 dark:bg-slate-900/40">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tutor Guidelines</p>
                  <div className="mt-4 space-y-4 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                    <p>Ask for the next step, not a full repeat.</p>
                    <p>Reference the image, video, or graph you mean.</p>
                    <p>If the tutor asked a clarification, answer that directly.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6 xl:sticky xl:top-8">
          <div className="neo-border neo-shadow-sm rounded-[1.8rem] bg-white p-5 dark:bg-slate-900">
            <label htmlFor="follow-up-input" className="patch text-[10px] uppercase">
              Compose Follow-Up
            </label>
            <textarea
              id="follow-up-input"
              ref={effectiveInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Ask for one clear next move…"
              rows={5}
              className="neo-border-thin mt-4 min-h-[160px] w-full resize-none rounded-2xl bg-[var(--aqs-paper)] px-4 py-4 text-[16px] font-medium leading-relaxed text-[var(--aqs-ink)] outline-none focus:ring-4 focus:ring-[color:rgba(139,30,63,0.1)] dark:bg-slate-950 dark:text-white"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={!input.trim() || isLoading}
              className="neo-border neo-shadow mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--aqs-accent)] py-4 text-base font-black text-white transition-all hover:-translate-y-1 active:translate-y-px active:shadow-none disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
              Send Follow-Up
            </button>
          </div>

          <div className="neo-border-thin neo-shadow-sm rounded-[1.8rem] bg-[var(--aqs-gold-soft)] p-5 dark:bg-[color:rgba(198,156,67,0.1)]">
            <div className="flex items-start gap-4">
              <Sparkles className="mt-1 h-5 w-5 text-[var(--aqs-gold)]" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aqs-gold)] opacity-70">
                  Ask Better
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                  Best results come from one clear ask at a time. If the tutor requested clarification, answer that directly.
                </p>
              </div>
            </div>
          </div>

          {lastUserMessage ? (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  void onRetryLast();
                }}
                disabled={isLoading}
                className="neo-border-thin neo-shadow-sm flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-[var(--aqs-ink)] transition-all hover:-translate-y-0.5 active:translate-y-px dark:bg-slate-900 dark:text-white"
              >
                <RefreshCw className="h-4 w-4 text-[var(--aqs-accent)]" />
                Retry Last
              </button>
              <button
                type="button"
                onClick={() => setInput(lastUserMessage)}
                disabled={isLoading}
                className="neo-border-thin neo-shadow-sm flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-[var(--aqs-ink)] transition-all hover:-translate-y-0.5 active:translate-y-px dark:bg-slate-900 dark:text-white"
              >
                <PencilLine className="h-4 w-4 text-[var(--aqs-gold)]" />
                Edit Last
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
