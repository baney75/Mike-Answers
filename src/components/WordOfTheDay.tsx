import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Volume2,
  X,
} from "lucide-react";

import { chatWithTutor } from "../services/gemini";
import { getWordOfTheDay, type WordOfTheDay as WotdType } from "../services/wotd";
import { RichResponse } from "./RichResponse";

interface WordOfTheDayProps {
  onClose?: () => void;
  onReturn?: () => void;
}

export function WordOfTheDay({ onClose, onReturn }: WordOfTheDayProps) {
  const [wotd, setWotd] = useState<WotdType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAskPanel, setShowAskPanel] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "tutor"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadWotd = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) {
      setRefreshing(true);
    }

    try {
      const nextWord = await getWordOfTheDay(forceRefresh);
      setWotd(nextWord);
      setChatMessages([]);
      setShowAskPanel(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load word of the day.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWotd();
  }, [loadWotd]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const formattedDate = wotd
    ? new Date(wotd.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const handleAsk = useCallback(async () => {
    if (!wotd || !chatInput.trim() || isChatLoading) {
      return;
    }

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsChatLoading(true);

    try {
      const prompt = `You are helping the user learn today's Merriam-Webster word of the day.

Word: ${wotd.word}
Pronunciation: ${wotd.phonetic || "N/A"}
Part of speech: ${wotd.partOfSpeech || "N/A"}
Definition: ${wotd.definition}
${wotd.example ? `Example: ${wotd.example}` : ""}
Source: ${wotd.sourceUrl}

Answer the user's question directly. Stay focused on understanding, usage, nuance, or etymology.`;

      const reply = await chatWithTutor([], `${prompt}\n\nUser question: ${userMessage}`);
      setChatMessages((prev) => [...prev, { role: "tutor", text: reply }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "tutor", text: "I couldn't answer that right now. Please try again." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, wotd]);

  const speakWord = useCallback((word: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const playAudio = useCallback(async () => {
    if (!wotd) {
      return;
    }

    window.speechSynthesis?.cancel();

    if (!wotd.audioUrl) {
      speakWord(wotd.word);
      return;
    }

    try {
      const nextAudio = audioRef.current?.src === wotd.audioUrl
        ? audioRef.current
        : new Audio(wotd.audioUrl);

      nextAudio.preload = "auto";
      nextAudio.currentTime = 0;
      audioRef.current = nextAudio;
      await nextAudio.play();
    } catch {
      speakWord(wotd.word);
    }
  }, [speakWord, wotd]);

  if (loading) {
    return (
      <div className="studio-panel bg-white p-12 dark:bg-slate-900">
        <div className="flex flex-col items-center justify-center gap-6">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--aqs-accent)]" />
          <p className="text-lg font-medium text-slate-500">Syncing Merriam-Webster desk...</p>
        </div>
      </div>
    );
  }

  if (error || !wotd) {
    return (
      <div className="studio-panel bg-white p-12 dark:bg-slate-900 text-center">
        <p className="text-xl font-bold text-[var(--aqs-ink)] dark:text-white mb-6">{error || "Failed to load word."}</p>
        <button
          type="button"
          onClick={() => void loadWotd(true)}
          className="neo-border neo-shadow inline-flex items-center gap-3 rounded-2xl bg-[var(--aqs-accent)] px-8 py-4 font-black text-white"
        >
          <RefreshCw className="h-5 w-5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {onReturn ? (
        <div className="neo-border-thin flex items-center justify-between gap-4 rounded-2xl bg-amber-50 px-6 py-4 dark:bg-amber-950/20">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <RefreshCw className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">
              Task in progress
            </span>
          </div>
          <button
            type="button"
            onClick={onReturn}
            className="studio-card bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-amber-700 hover:bg-amber-50"
          >
            View Answer
            <ArrowRight className="ml-2 inline h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <section className="studio-panel overflow-hidden bg-white dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b-2 border-[var(--aqs-border)]/5 bg-[var(--aqs-accent-soft)] px-6 py-6 dark:bg-[color:rgba(139,30,63,0.1)]">
          <div className="flex items-center gap-4">
            {onReturn ? (
              <button
                type="button"
                onClick={onReturn}
                className="studio-card h-10 w-10 bg-white dark:bg-slate-900"
                aria-label="Back to answer"
              >
                <ArrowLeft className="mx-auto h-5 w-5" />
              </button>
            ) : null}
            <div className="neo-border-thin neo-shadow-sm flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--aqs-accent)] text-white">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                Daily Vocabulary
              </p>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadWotd(true)}
              disabled={refreshing}
              className="studio-card bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all dark:bg-slate-900"
            >
              <RefreshCw className={`mr-2 inline h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Sync Feed
            </button>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="studio-card bg-white h-10 w-10 transition-all dark:bg-slate-900"
              >
                <X className="mx-auto h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-10 p-8 md:p-12">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="space-y-4">
              <h2 className="text-5xl font-black tracking-tighter text-[var(--aqs-ink)] dark:text-white md:text-7xl">
                {wotd.word}
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                {wotd.phonetic ? (
                  <span className="font-mono text-xl text-slate-400">
                    /{wotd.phonetic}/
                  </span>
                ) : null}
                {wotd.partOfSpeech ? (
                  <span className="patch">
                    {wotd.partOfSpeech}
                  </span>
                ) : null}
                {wotd.audioUrl || wotd.word ? (
                  <button
                    type="button"
                    onClick={playAudio}
                    className="studio-card inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest dark:bg-slate-900"
                  >
                    <Volume2 className="h-4 w-4 text-[var(--aqs-accent)]" />
                    Pronounce
                  </button>
                ) : null}
              </div>
            </div>

            <a
              href={wotd.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="studio-card inline-flex items-center gap-2 bg-white px-6 py-4 text-xs font-black uppercase tracking-widest dark:bg-slate-900"
            >
              Merriam-Webster
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="studio-card bg-slate-50 p-8 dark:bg-slate-900/50">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
              Primary Definition
            </p>
            <p className="mt-6 text-2xl font-medium leading-relaxed text-[var(--aqs-ink)] dark:text-white md:text-3xl">
              {wotd.definition}
            </p>
            {wotd.example ? (
              <div className="mt-8 rounded-[1.5rem] bg-white p-6 shadow-sm dark:bg-slate-950">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Usage Context
                </p>
                <p className="mt-4 text-lg italic font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  “{wotd.example}”
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setShowAskPanel((value) => !value)}
              className="neo-border neo-shadow inline-flex items-center gap-3 rounded-2xl bg-[var(--aqs-accent)] px-8 py-4 text-base font-black text-white transition-all hover:-translate-y-1 active:translate-y-px"
            >
              <MessageCircle className="h-5 w-5" />
              {showAskPanel ? "Hide Analyst" : "Investigate Word"}
            </button>
            <p className="max-w-md text-sm font-medium text-slate-500 leading-relaxed">
              Open the analyst panel to explore etymology, synonyms, or advanced usage scenarios.
            </p>
          </div>
        </div>
      </section>

      {showAskPanel ? (
        <section className="studio-panel overflow-hidden bg-white dark:bg-slate-950 animate-in slide-in-from-top-4 duration-500">
          <div className="border-b-2 border-[var(--aqs-border)]/5 bg-[var(--aqs-accent-soft)] px-6 py-6 dark:bg-[color:rgba(139,30,63,0.1)]">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
              Analyst Desk
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              Exploring linguistic provenance and advanced context for <span className="font-black">"{wotd.word}"</span>.
            </p>
          </div>

          <div className="space-y-8 p-6 md:p-10">
            {chatMessages.length > 0 ? (
              <div className="scroll-studio max-h-[420px] space-y-6 overflow-y-auto pr-4 rounded-[2rem] bg-slate-50/50 p-6 dark:bg-slate-900/30">
                {chatMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={`max-w-[90%] rounded-[1.8rem] border-2 px-6 py-4 ${
                        message.role === "user"
                          ? "border-[var(--aqs-border)] bg-[var(--aqs-accent)] text-white"
                          : "border-[var(--aqs-border)] bg-white text-[var(--aqs-ink)] dark:bg-slate-900 dark:text-white"
                      }`}
                    >
                      <p className={`mb-2 text-[9px] font-black uppercase tracking-widest ${message.role === "user" ? "text-white/60" : "text-slate-400"}`}>
                        {message.role === "user" ? "Inquiry" : "Analysis"}
                      </p>
                      {message.role === "tutor" ? <RichResponse text={message.text} compact /> : <p className="text-sm font-medium leading-relaxed">{message.text}</p>}
                    </div>
                  </div>
                ))}
                {isChatLoading ? (
                  <div className="flex justify-start">
                    <div className="studio-card flex items-center gap-3 bg-white px-5 py-3 dark:bg-slate-900">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--aqs-accent)]" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Processing...</span>
                    </div>
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {[
                `Etymology of "${wotd.word}"`,
                `Advanced usage examples`,
                `Nuance vs similar words`,
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setChatInput(suggestion)}
                  className="studio-card bg-white px-4 py-2 text-xs font-black text-slate-500 dark:bg-slate-900"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleAsk();
              }}
              className="flex gap-4"
            >
              <div className="neo-border-thin studio-focus flex-1 rounded-2xl bg-white p-1 dark:bg-slate-950">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder={`Ask Mike about "${wotd.word}"…`}
                  aria-label={`Ask about the word ${wotd.word}`}
                  name="word-chat"
                  autoComplete="off"
                  disabled={isChatLoading}
                  className="w-full bg-transparent px-5 py-4 text-base font-medium text-[var(--aqs-ink)] outline-none dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="neo-border neo-shadow flex items-center justify-center rounded-xl bg-[var(--aqs-accent)] px-6 py-4 text-white transition-all hover:-translate-y-1 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
