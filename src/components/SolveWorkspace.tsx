import type { ChatMessage, SolveMode } from "../types";
import { ActionBar } from "./ActionBar";
import { FollowUpDock, FollowUpTranscript } from "./ChatPanel";
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
  const shouldShowFollowUp =
    chatHistory.length > 0 || isChatLoading || Boolean(chatPrefill?.text) || starterPrompts.length > 0;

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="scroll-studio min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4">
          <SolutionDisplay
            solution={solution}
            hideAnswerByDefault={hideAnswerByDefault}
          />

          {shouldShowFollowUp ? (
            <FollowUpTranscript
              messages={chatHistory}
              isLoading={isChatLoading}
            />
          ) : null}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1080px] shrink-0 flex-col gap-4">
        {shouldShowFollowUp ? (
          <FollowUpDock
            messages={chatHistory}
            isLoading={isChatLoading}
            lastUserMessage={lastFollowUpQuestion}
            contextText={solution}
            onSend={onSendChat}
            onRetryLast={onRetryChat}
            inputRef={chatInputRef}
            prefillText={chatPrefill}
            onConsumePrefill={onConsumePrefill}
            starterPrompts={starterPrompts}
          />
        ) : null}

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
    </div>
  );
}
