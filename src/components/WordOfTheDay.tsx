import { useEffect, useState, useCallback, useRef } from "react";
import { BookOpen, RefreshCw, ExternalLink, Loader2, Send, MessageCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { getWordOfTheDay, type WordOfTheDay as WotdType } from "../services/wotd";
import { chatWithTutor } from "../services/gemini";
import { stripSolutionClientArtifacts } from "../utils/solution";
import type { ChatMessage } from "../types";

interface WordOfTheDayProps {
  onClose?: () => void;
  onReturn?: () => void;
}

export function WordOfTheDay({ onClose, onReturn }: WordOfTheDayProps) {
  const [wotd, setWotd] = useState<WotdType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const loadWotd = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) setRefreshing(true);

    try {
      const word = await getWordOfTheDay(forceRefresh);
      setWotd(word);
      setChatMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load word of the day");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWotd();
  }, [loadWotd]);

  useEffect(() => {
    if (chatMessages.length > prevMessagesLengthRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = chatMessages.length;
  });

  const handleSendChat = useCallback(async () => {
    if (!wotd || !chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsChatLoading(true);

    try {
      const wotdContext = `You are helping the user learn about today's Word of the Day: "${wotd.word}".

Word of the Day Details:
- Word: ${wotd.word}
- Pronunciation: ${wotd.phonetic || "N/A"}
- Part of Speech: ${wotd.partOfSpeech || "N/A"}
- Definition: ${wotd.definition}
${wotd.example ? `- Example: ${wotd.example}` : ""}
- Source: ${wotd.sourceUrl}

Please answer any questions the user has about this word, its meaning, usage, etymology, or related concepts. Be informative and educational.`;

      const history: ChatMessage[] = [
        { role: "user", text: "Please help me understand this word." },
        { role: "tutor", text: wotdContext },
        { role: "user", text: userMessage },
      ];

      const reply = await chatWithTutor(history.slice(0, -1), userMessage);
      setChatMessages((prev) => [...prev, { role: "tutor", text: reply }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "tutor", text: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }, [wotd, chatInput, isChatLoading]);

  if (loading) {
    return (
      <div className="rounded-[2rem] border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-900 neo-shadow overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center min-h-[200px] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--aqs-accent)]" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading word of the day...</p>
        </div>
      </div>
    );
  }

  if (error || !wotd) {
    return (
      <div className="rounded-[2rem] border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-900 neo-shadow overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center min-h-[200px] gap-4">
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {error || "Failed to load word of the day"}
          </p>
          <button
            type="button"
            onClick={() => void loadWotd(true)}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-900 bg-white px-4 py-2 font-bold text-gray-900 transition hover:-translate-y-0.5 hover:bg-gray-50 neo-shadow-sm dark:border-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(wotd.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {onReturn && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Your question is being answered in the background
            </span>
          </div>
          <button
            type="button"
            onClick={onReturn}
            className="flex items-center gap-2 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-sm font-bold hover:bg-amber-700 transition"
          >
            <span>View Answer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="rounded-[2rem] border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-900 neo-shadow overflow-hidden">
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b-2 border-gray-900 dark:border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onReturn && (
              <button
                type="button"
                onClick={onReturn}
                className="rounded-lg bg-[var(--aqs-accent)] p-2 text-white hover:bg-[var(--aqs-accent-strong)] transition"
                title="Back to answer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="rounded-lg bg-[var(--aqs-accent)] p-2">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                Word of the Day
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{formattedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadWotd(true)}
              disabled={refreshing}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-[var(--aqs-accent)] dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-[var(--aqs-accent-dark)] transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
              >
                Close
              </button>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                {wotd.word}
              </h2>
              {(wotd.phonetic || wotd.partOfSpeech) && (
                <div className="flex items-center gap-3 mt-2">
                  {wotd.phonetic && (
                    <span className="font-mono text-lg text-gray-500 dark:text-gray-400">
                      /{wotd.phonetic}/
                    </span>
                  )}
                  {wotd.partOfSpeech && (
                    <span className="inline-block rounded bg-[var(--aqs-accent)]/10 px-2 py-1 text-xs font-mono font-bold uppercase text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                      {wotd.partOfSpeech}
                    </span>
                  )}
                </div>
              )}
            </div>
            <a
              href={wotd.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-900 bg-white px-3 py-2 font-bold text-gray-900 transition hover:-translate-y-0.5 hover:bg-gray-50 neo-shadow-sm dark:border-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
              title="View on Merriam-Webster"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="sr-only md:not-sr-only">Source</span>
            </a>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-lg md:text-xl text-gray-900 dark:text-gray-100 leading-relaxed font-medium">
                {wotd.definition}
              </p>
            </div>

            {wotd.example && (
              <div className="pl-4 border-l-4 border-[var(--aqs-accent)]">
                <p className="text-gray-600 dark:text-gray-400 italic text-lg">
                  &ldquo;{wotd.example}&rdquo;
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--aqs-accent-soft)] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[var(--aqs-accent-strong)]" />
              </div>
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                Merriam-Webster
              </span>
            </div>
            <span className="text-xs font-mono text-gray-500 dark:text-gray-500">
              Updated daily
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-900 neo-shadow overflow-hidden">
        <div className="bg-[var(--aqs-accent-soft)] dark:bg-[color:rgba(122,31,52,0.18)] border-b-2 border-gray-900 dark:border-gray-100 p-4 flex items-center gap-3">
          <div className="rounded-lg bg-[var(--aqs-accent)] p-2">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
              Ask About This Word
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Have questions? Ask the AI tutor!
            </p>
          </div>
        </div>

        <div className="p-4 md:p-6 max-h-[400px] overflow-y-auto space-y-4">
          {chatMessages.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Ask me anything about &ldquo;{wotd.word}&rdquo;!
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  `What does "${wotd.word}" mean?`,
                  `Use "${wotd.word}" in a sentence`,
                  `What is the etymology of "${wotd.word}"?`,
                  `Synonyms for "${wotd.word}"?`,
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setChatInput(suggestion);
                    }}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-[var(--aqs-accent)] text-white neo-shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-900 dark:border-gray-100"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 border-2 border-gray-900 dark:border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t-2 border-gray-900 dark:border-gray-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendChat();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask about "${wotd.word}"...`}
              disabled={isChatLoading}
              className="flex-1 rounded-xl border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-[var(--aqs-accent)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(122,31,52,0.18)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="rounded-xl bg-[var(--aqs-accent)] px-4 py-3 text-white transition hover:-translate-y-0.5 hover:neo-shadow disabled:opacity-50 disabled:transform-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
