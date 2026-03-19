import { useState, useEffect, useRef } from "react";
import { MessageSquare, PencilLine, RefreshCw, Send, X } from "lucide-react";

import type { ChatMessage } from "../types";
import { RichResponse } from "./RichResponse";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => Promise<boolean>;
  onRetryLast: () => Promise<boolean>;
  lastUserMessage: string | null;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function TutorMessage({ text }: { text: string }) {
  return <RichResponse text={text} compact />;
}

export function ChatPanel({ messages, isLoading, onSend, onRetryLast, lastUserMessage, inputRef }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>(messages);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const internalInputRef = useRef<HTMLInputElement>(null);
  const effectiveInputRef = inputRef ?? internalInputRef;

  useEffect(() => {
    setVisibleMessages(messages);
    setDismissedIds(new Set());
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && visibleMessages.length > 0 && !isLoading) {
        const lastVisibleIdx = [...visibleMessages.keys()].reverse().find((i) => !dismissedIds.has(i));
        if (lastVisibleIdx !== undefined) {
          setDismissedIds((prev) => new Set([...prev, lastVisibleIdx]));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visibleMessages, dismissedIds, isLoading]);

  const activeMessages = visibleMessages.filter((_, i) => !dismissedIds.has(i));

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    const success = await onSend(trimmed);
    if (success) {
      setInput("");
      setDismissedIds(new Set());
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-900 dark:border-gray-100 neo-shadow overflow-hidden no-print">
      {/* Header */}
      <div className="p-4 bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-900 dark:border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-900 dark:text-gray-100" />
          <h3 className="font-bold font-sans text-lg text-gray-900 dark:text-gray-100">
            Follow-up Questions
          </h3>
        </div>
        {activeMessages.length < visibleMessages.length && (
          <button
            type="button"
            onClick={() => setDismissedIds(new Set())}
            className="text-xs text-[var(--aqs-accent)] dark:text-[var(--aqs-accent-dark)] hover:underline"
          >
            Show dismissed ({visibleMessages.length - activeMessages.length})
          </button>
        )}
      </div>

      <div className="p-4 md:p-6">
        {/* Message list */}
        {activeMessages.length > 0 ? (
          <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
            {activeMessages.map((msg, idx) => {
              const originalIdx = visibleMessages.findIndex((m, i) => m === msg && !dismissedIds.has(i));
              return (
                <div key={`${msg.role}-${originalIdx}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}>
                  <div
                    className={`relative max-w-[85%] rounded-xl px-4 py-3 border-2 border-gray-900 dark:border-gray-100 neo-shadow-sm ${
                      msg.role === "user"
                        ? "bg-[var(--aqs-accent-soft)] dark:bg-[color:rgba(122,31,52,0.28)]"
                        : "bg-white dark:bg-gray-800"
                    } text-gray-900 dark:text-gray-100`}
                  >
                    <button
                      type="button"
                      onClick={() => setDismissedIds((prev) => new Set([...prev, originalIdx]))}
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-900 rounded-full p-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Dismiss (ESC)"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap text-sm font-medium">{msg.text}</p>
                    ) : (
                      <TutorMessage text={msg.text} />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-100 neo-shadow-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        ) : visibleMessages.length > 0 && dismissedIds.size > 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4 mb-6">
            Messages dismissed. Click "Show dismissed" to restore them.
          </p>
        ) : null}

        {/* Input */}
        <div className="flex gap-3">
          <input
            ref={effectiveInputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Ask a follow-up question..."
            className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none neo-shadow-sm font-medium"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center rounded-xl border-2 border-gray-900 bg-[var(--aqs-accent)] p-3 text-white transition-all neo-shadow-sm hover:bg-[var(--aqs-accent-strong)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-gray-300 disabled:active:translate-x-0 disabled:active:translate-y-0 dark:border-gray-100 dark:disabled:bg-gray-700"
            aria-label="Send follow-up question"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {lastUserMessage ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                void onRetryLast();
              }}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-900 bg-white px-4 py-2 font-bold text-gray-900 transition-all neo-shadow-sm hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-gray-200 dark:border-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:disabled:bg-gray-700 sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Last
            </button>
            <button
              type="button"
              onClick={() => setInput(lastUserMessage)}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-900 bg-white px-4 py-2 font-bold text-gray-900 transition-all neo-shadow-sm hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-gray-200 dark:border-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:disabled:bg-gray-700 sm:w-auto"
            >
              <PencilLine className="h-4 w-4" />
              Edit Last
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
