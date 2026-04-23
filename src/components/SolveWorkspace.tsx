import { useEffect, useState } from "react";

import type { ChatMessage, SolveMode } from "../types";
import { ActionBar } from "./ActionBar";
import { ChatPanel } from "./ChatPanel";
import { LoadingState } from "./LoadingState";
import { RichResponse } from "./RichResponse";
import { SolutionDisplay } from "./SolutionDisplay";

interface SolveWorkspaceProps {
  solution: string;
  hideAnswerByDefault: boolean;
  chatHistory: ChatMessage[];
  isChatLoading: boolean;
  onSendChat: (text: string, options?: { retryLast?: boolean }) => Promise<boolean>;
  onRetryChat: () => Promise<boolean>;
  lastFollowUpQuestion: string | null;
  lastMode: Exclude<SolveMode, "research">;
  canRetryEdit: boolean;
  canRetrySolve: boolean;
  onCiteAi: () => void;
  onSolveAgain: (mode: Exclude<SolveMode, "research">, detailed?: boolean) => void;
  onRetry: () => void;
  onEditRequest: () => void;
  onClear: () => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  chatPrefill: { id: number; text: string } | null;
  onConsumePrefill: () => void;
  starterPrompts: string[];
}

export function SolveWorkspace({
  solution,
  hideAnswerByDefault,
  chatHistory,
  isChatLoading,
  onSendChat,
  onRetryChat,
  lastFollowUpQuestion,
  lastMode,
  canRetryEdit,
  canRetrySolve,
  onCiteAi,
  onSolveAgain,
  onRetry,
  onEditRequest,
  onClear,
  chatInputRef,
  chatPrefill,
  onConsumePrefill,
  starterPrompts,
}: SolveWorkspaceProps) {
  const [mobilePane, setMobilePane] = useState<"answer" | "chat">("answer");

  useEffect(() => {
    setMobilePane(chatHistory.length > 0 || isChatLoading ? "chat" : "answer");
  }, [chatHistory.length, isChatLoading]);

  useEffect(() => {
    setMobilePane("answer");
  }, [solution]);

  useEffect(() => {
    if (chatPrefill?.text) {
      setMobilePane("chat");
    }
  }, [chatPrefill]);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 xl:grid xl:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="no-print grid shrink-0 grid-cols-2 gap-2 xl:hidden">
        <button
          type="button"
          onClick={() => setMobilePane("answer")}
          className={`neo-border-thin neo-shadow-sm rounded-[1.15rem] px-4 py-3 text-sm font-black ${
            mobilePane === "answer"
              ? "bg-(--aqs-accent) text-white"
              : "bg-white text-(--aqs-ink) dark:bg-slate-900 dark:text-white"
          }`}
        >
          Answer
        </button>
        <button
          type="button"
          onClick={() => setMobilePane("chat")}
          className={`neo-border-thin neo-shadow-sm rounded-[1.15rem] px-4 py-3 text-sm font-black ${
            mobilePane === "chat"
              ? "bg-(--aqs-accent) text-white"
              : "bg-white text-(--aqs-ink) dark:bg-slate-900 dark:text-white"
          }`}
        >
          Follow-Up
        </button>
      </div>

      <div className={`${mobilePane === "chat" ? "hidden" : "flex"} min-h-0 flex-col gap-4 xl:flex`}>
        <div className="scroll-studio min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-4">
            <SolutionDisplay
              solution={solution}
              hideAnswerByDefault={hideAnswerByDefault}
            />

            {chatHistory.length > 0 ? (
              <section className="hidden rounded-[1.6rem] border border-(--aqs-ink)/10 bg-white/94 p-6 print:block dark:border-white/10 dark:bg-slate-950/92">
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-(--aqs-accent-strong)">
                  Follow-Up Transcript
                </p>
                <div className="mt-5 space-y-4">
                  {chatHistory.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className="rounded-[1.3rem] border border-(--aqs-ink)/8 bg-(--aqs-paper-strong) px-5 py-4 dark:border-white/8 dark:bg-slate-900/72"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                        {message.role === "user" ? "You" : "Mike"}
                      </p>
                      <div className="mt-3 text-sm font-medium leading-relaxed text-(--aqs-ink)">
                        {message.role === "tutor" ? <RichResponse text={message.text} compact /> : <p>{message.text}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <ActionBar
          lastMode={lastMode}
          canRetryEdit={canRetryEdit}
          canRetrySolve={canRetrySolve}
          onCiteAi={onCiteAi}
          onSolveAgain={onSolveAgain}
          onRetry={onRetry}
          onEditRequest={onEditRequest}
          onClear={onClear}
        />
      </div>

      <div className={`${mobilePane === "answer" ? "hidden" : "min-h-0"} xl:block xl:min-h-0`}>
        <ChatPanel
          messages={chatHistory}
          isLoading={isChatLoading}
          lastUserMessage={lastFollowUpQuestion}
          contextText={solution}
          onSend={onSendChat}
          onRetryLast={onRetryChat}
          onEscape={() => {
            if (mobilePane === "chat") {
              setMobilePane("answer");
            }
          }}
          inputRef={chatInputRef}
          prefillText={chatPrefill}
          onConsumePrefill={onConsumePrefill}
          starterPrompts={starterPrompts}
        />
      </div>
    </div>
  );
}
