import { useEffect, useMemo, useRef, useState } from "react";
import { PencilLine, RefreshCw, Send } from "lucide-react";

import type { ChatMessage } from "../types";
import { RichResponse } from "./RichResponse";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => Promise<boolean>;
  onRetryLast: () => Promise<boolean>;
  lastUserMessage: string | null;
  contextText?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  prefillText?: { id: number; text: string } | null;
  onConsumePrefill?: () => void;
  starterPrompts?: string[];
  onEscape?: () => void;
}

function cleanSuggestionLabel(suggestion: string) {
  return suggestion
    .replace(/\s+/g, " ")
    .replace(/[.。]\s*$/, "")
    .trim();
}

function TutorMessage({ text }: { text: string }) {
  return <RichResponse text={text} compact />;
}

export function ChatPanel({
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
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const effectiveInputRef = inputRef ?? internalInputRef;
  const endRef = useRef<HTMLDivElement>(null);

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

  const visibleSuggestions = (
    followUpSuggestions.length > 0 ? followUpSuggestions : starterPrompts
  ).slice(0, 3);

  const turnCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: messages.length > 0 ? "smooth" : "auto", block: "end" });
  }, [messages]);

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

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

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

    if (document.activeElement instanceof HTMLElement && panelRef.current?.contains(document.activeElement)) {
      document.activeElement.blur();
      return;
    }

    onEscape?.();
  };

  const isTutorFailureMessage = (text: string) =>
    /^Sorry, I couldn't process that right now\./i.test(text.trim()) ||
    /Mike needs a configured provider before .* chat can run\./i.test(text.trim());

  return (
    <div
      ref={panelRef}
      data-chat-panel="true"
      onKeyDownCapture={handlePanelEscape}
      className="no-print paper-panel flex h-full min-h-0 flex-col overflow-hidden p-0"
    >
      {/* Header: compact, just the title and turn count */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-(--aqs-ink)/10 bg-(--aqs-paper-strong) px-4 py-2.5 dark:border-white/10 dark:bg-slate-900/40 md:px-5 md:py-3">
        <h3 className="text-sm font-black text-(--aqs-ink) dark:text-white">
          Follow-Up
        </h3>
        {turnCount > 0 ? (
          <span className="rounded-full border border-(--aqs-ink)/10 bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
            {turnCount} turn{turnCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5 md:gap-2.5 md:p-3">
        <div className="scroll-panel flex-1 min-h-0 overflow-y-auto rounded-[1.3rem] border border-(--aqs-ink)/8 bg-(--aqs-paper-strong) p-2.5 dark:border-white/8 dark:bg-slate-950/20 md:p-3">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-center text-sm font-medium text-slate-400 dark:text-slate-500">
                {isClarificationMode
                  ? "State the exact problem or task."
                  : "Ask a follow-up question to dig deeper."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[94%] rounded-[1.2rem] border p-3 md:max-w-[88%] md:p-3.5 ${
                      message.role === "user"
                        ? "border-(--aqs-ink)/10 bg-(--aqs-accent-soft) text-(--aqs-ink) dark:border-white/10 dark:bg-[rgba(139,30,63,0.25)] dark:text-white"
                        : isTutorFailureMessage(message.text)
                          ? "border-(--aqs-accent)/20 bg-(--aqs-accent-soft) text-(--aqs-ink)"
                          : "border-(--aqs-ink)/8 bg-white text-(--aqs-ink) dark:border-white/8 dark:bg-slate-900 dark:text-white"
                    }`}
                  >
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      {message.role === "user" ? "You" : isTutorFailureMessage(message.text) ? "System" : "Mike"}
                    </p>
                    {message.role === "user" ? (
                      <p className="break-words whitespace-pre-wrap text-[14px] font-medium leading-relaxed md:text-[15px]">
                        {message.text}
                      </p>
                    ) : isTutorFailureMessage(message.text) ? (
                      <p className="text-[14px] font-medium leading-relaxed md:text-[15px]">{message.text}</p>
                    ) : (
                      <TutorMessage text={message.text} />
                    )}
                  </div>
                </div>
              ))}

              {isLoading ? (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-full border border-(--aqs-ink)/8 bg-white px-4 py-2.5 dark:border-white/8 dark:bg-slate-900">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--aqs-accent)" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--aqs-accent)" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--aqs-accent)" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Suggestions */}
        {visibleSuggestions.length > 0 ? (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {visibleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  void handleSuggestion(suggestion);
                }}
                className="rounded-full border border-(--aqs-ink)/8 bg-white px-2.5 py-1.5 text-[11px] font-bold text-(--aqs-ink) transition hover:border-(--aqs-accent)/20 hover:bg-slate-50 dark:border-white/8 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {/* Composer: textarea + send inline */}
        <div className="shrink-0 flex items-end gap-2 rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white p-2 dark:border-white/10 dark:bg-slate-900 md:rounded-[1.3rem] md:p-2.5">
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
            className="min-h-[2.5rem] max-h-[6rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] font-medium leading-snug text-(--aqs-ink) outline-none placeholder:text-slate-400 dark:text-white md:min-h-[2.8rem] md:text-[15px]"
            disabled={isLoading}
            placeholder={
              isClarificationMode
                ? "Paste the exact problem..."
                : "Ask a follow-up..."
            }
          />
          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--aqs-accent) text-white transition-all hover:bg-(--aqs-accent-strong) disabled:opacity-40 md:h-10 md:w-10"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Retry/edit row */}
        {lastUserMessage ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => {
                void onRetryLast();
              }}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[0.9rem] border border-(--aqs-ink)/8 bg-white py-2 text-xs font-bold text-(--aqs-ink) transition disabled:opacity-40 dark:border-white/8 dark:bg-slate-900 dark:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5 text-(--aqs-accent)" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => setInput(lastUserMessage)}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[0.9rem] border border-(--aqs-ink)/8 bg-white py-2 text-xs font-bold text-(--aqs-ink) transition disabled:opacity-40 dark:border-white/8 dark:bg-slate-900 dark:text-white"
            >
              <PencilLine className="h-3.5 w-3.5 text-(--aqs-gold)" />
              Edit
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
