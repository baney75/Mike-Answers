import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircle,
  Newspaper,
  RefreshCw,
  Rss,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import {
  NEWS_SOURCES,
  buildNewsReasoningContext,
  fetchAllNewsWithStatus,
  fetchNewsForQueryWithStatus,
  hydrateNewsArticles,
  type NewsArticle,
} from "../services/news";
import { chatWithTutor } from "../services/gemini";
import { RichResponse } from "./RichResponse";

interface NewsViewProps {
  initialQuery?: string;
  onClose?: () => void;
  onReturn?: () => void;
  hasBackgroundTask?: boolean;
}

function formatRelativeTime(dateString: string) {
  const time = new Date(dateString).getTime();
  if (Number.isNaN(time)) {
    return "";
  }

  const diffMs = Date.now() - time;
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatPublishedLabel(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SourceToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
        active
          ? "border-[var(--aqs-accent)] bg-[var(--aqs-accent)] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-500 hover:border-[var(--aqs-accent)] hover:text-[var(--aqs-accent-strong)] dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function ArticleMeta({
  article,
  compact = false,
}: {
  article: NewsArticle;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? "text-[10px]" : "text-xs"} font-black uppercase tracking-widest text-slate-400`}>
      <span className="rounded-full bg-[var(--aqs-accent-soft)] px-3 py-1 text-[var(--aqs-accent-strong)] dark:bg-[color:rgba(122,31,52,0.2)] dark:text-[var(--aqs-accent-dark)]">
        {article.source}
      </span>
      <span className="hidden sm:inline opacity-40">•</span>
      <span className="hidden sm:inline">{article.sourceBias}</span>
      <span className="hidden md:inline opacity-40">•</span>
      <span className="hidden md:inline">{article.sourceType === "wire" ? "Primary Report" : "Analysis"}</span>
      <span className="inline-flex items-center gap-1.5 ml-auto">
        <Clock3 className="h-3.5 w-3.5" />
        {formatRelativeTime(article.pubDate)}
      </span>
    </div>
  );
}

function ArticleButtons({
  article,
  onAsk,
}: {
  article: NewsArticle;
  onAsk: (article: NewsArticle) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={article.directArticleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="studio-card inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black transition-all"
      >
        Source Article
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      {article.primarySourceUrl ? (
        <a
          href={article.primarySourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="studio-card inline-flex items-center gap-2 bg-[var(--aqs-accent-soft)] px-4 py-2.5 text-xs font-black text-[var(--aqs-accent-strong)] dark:bg-slate-800 dark:text-white"
        >
          Primary Evidence
          <ShieldCheck className="h-3.5 w-3.5" />
        </a>
      ) : null}
      <button
        type="button"
        onClick={() => onAsk(article)}
        className="neo-border-thin neo-shadow-sm ml-auto inline-flex items-center gap-2 rounded-xl bg-[var(--aqs-accent)] px-5 py-2.5 text-xs font-black text-white transition-all hover:-translate-y-0.5 active:translate-y-px"
      >
        Investigate
        <MessageCircle className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LeadStory({
  article,
  onAsk,
}: {
  article: NewsArticle;
  onAsk: (article: NewsArticle) => void;
}) {
  return (
    <article className="studio-panel overflow-hidden bg-white p-5 dark:bg-slate-900 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="group relative aspect-[4/3] overflow-hidden rounded-[1.8rem] border-2 border-[var(--aqs-border)]">
          {article.thumbnail ? (
            <img
              src={article.thumbnail}
              alt={article.title}
              loading="eager"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--aqs-paper-strong)] dark:bg-slate-950">
              <Newspaper className="h-16 w-16 text-slate-200 dark:text-slate-800" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>

        <div className="flex flex-col justify-between py-2">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="patch flex items-center gap-2 bg-white text-[9px] dark:bg-slate-800">
                <Sparkles className="h-3 w-3 text-[var(--aqs-gold)]" />
                Lead Analysis
              </div>
              <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-black leading-[1.1] tracking-tight text-[var(--aqs-ink)] dark:text-white md:text-4xl lg:text-5xl">
                {article.title}
              </h2>
              <p className="text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                {article.description}
              </p>
            </div>

            <ArticleMeta article={article} />

            {article.contentText ? (
              <div className="rounded-[1.5rem] bg-slate-50 p-6 dark:bg-slate-950/50">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Data Extract
                </p>
                <p className="mt-4 line-clamp-5 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                  {article.contentText}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-8 border-t-2 border-slate-50 pt-8 dark:border-slate-800">
            <ArticleButtons article={article} onAsk={onAsk} />
          </div>
        </div>
      </div>
    </article>
  );
}

function LatestStory({
  article,
  onAsk,
}: {
  article: NewsArticle;
  onAsk: (article: NewsArticle) => void;
}) {
  return (
    <article className="studio-card flex flex-col justify-between gap-4 bg-white p-5 dark:bg-slate-900">
      <div className="space-y-3">
        <ArticleMeta article={article} compact />
        <h3 className="text-base font-black leading-snug text-[var(--aqs-ink)] dark:text-white">
          {article.title}
        </h3>
      </div>
      <div className="flex items-center justify-between border-t border-slate-50 pt-4 dark:border-slate-800">
        <span className="text-[10px] font-bold text-slate-400">
          {formatPublishedLabel(article.pubDate)}
        </span>
        <button
          type="button"
          onClick={() => onAsk(article)}
          className="text-xs font-black uppercase tracking-widest text-[var(--aqs-accent)] hover:underline"
        >
          Details
        </button>
      </div>
    </article>
  );
}

function StoryCard({
  article,
  onAsk,
}: {
  article: NewsArticle;
  onAsk: (article: NewsArticle) => void;
}) {
  return (
    <article className="studio-card overflow-hidden bg-white dark:bg-slate-900">
      <div className="group relative aspect-[16/9] overflow-hidden border-b-2 border-[var(--aqs-border)]">
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
            <Newspaper className="h-10 w-10 text-slate-200 dark:text-slate-800" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="space-y-4 p-6">
        <ArticleMeta article={article} compact />
        <div className="space-y-2">
          <h3 className="text-xl font-black leading-tight text-[var(--aqs-ink)] dark:text-white">{article.title}</h3>
          <p className="line-clamp-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {article.description}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {article.categories.slice(0, 2).map((category) => (
            <span key={category} className="patch text-[8px] bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800 dark:border-slate-700">
              {category}
            </span>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800">
          <ArticleButtons article={article} onAsk={onAsk} />
        </div>
      </div>
    </article>
  );
}

function BackgroundTaskBanner({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="neo-border-thin flex items-center justify-between gap-4 rounded-2xl bg-amber-50 px-6 py-4 dark:bg-amber-950/20">
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <RefreshCw className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
        </div>
        <span className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">
          Analyst Task Running in Background
        </span>
      </div>
      <button
        type="button"
        onClick={onReturn}
        className="studio-card bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-amber-700 hover:bg-amber-50"
      >
        View Solution
        <ArrowRight className="ml-2 inline h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function NewsView({ initialQuery = "", onClose, onReturn, hasBackgroundTask }: NewsViewProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "tutor"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const loadTokenRef = useRef(0);

  const loadNews = useCallback(
    async (searchQuery: string, forceRefresh = false) => {
      const loadToken = ++loadTokenRef.current;
      setLoading(true);
      setError(null);
      if (forceRefresh) {
        setRefreshing(true);
      }

      try {
        const result = searchQuery.trim()
          ? await fetchNewsForQueryWithStatus(searchQuery.trim(), 18, forceRefresh)
          : await fetchAllNewsWithStatus({ forceRefresh });
        if (loadToken !== loadTokenRef.current) {
          return;
        }

        setArticles(result.articles);
        setLoading(false);
        setRefreshing(false);
        setHydrating(true);

        void hydrateNewsArticles(result.articles, 8)
          .then((hydrated) => {
            if (loadToken === loadTokenRef.current) {
              setArticles(hydrated);
            }
          })
          .finally(() => {
            if (loadToken === loadTokenRef.current) {
              setHydrating(false);
            }
          });
      } catch (loadError) {
        if (loadToken === loadTokenRef.current) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load news.");
          setLoading(false);
          setRefreshing(false);
          setHydrating(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadNews(query);
  }, [loadNews, query]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!showChat) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      chatInputRef.current?.focus();
    }, 60);

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowChat(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showChat]);

  const filteredArticles = useMemo(() => {
    if (selectedSources.size === 0) {
      return articles;
    }
    return articles.filter((article) => selectedSources.has(article.source));
  }, [articles, selectedSources]);

  const leadArticle = filteredArticles[0] || null;
  const latestRail = filteredArticles.slice(1, 6);
  const deckArticles = filteredArticles.slice(6);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setQuery(searchInput);
  };

  const toggleSource = (sourceName: string) => {
    setSelectedSources((current) => {
      const next = new Set(current);
      if (next.has(sourceName)) {
        next.delete(sourceName);
      } else {
        next.add(sourceName);
      }
      return next;
    });
  };

  const sendNewsQuestion = useCallback(
    async (message: string, article?: NewsArticle) => {
      if (!message.trim() || isChatLoading || filteredArticles.length === 0) {
        return;
      }

      const userMessage = message.trim();
      setShowChat(true);
      setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);
      setIsChatLoading(true);

      try {
        const focusArticles = article
          ? [article, ...filteredArticles.filter((item) => item.link !== article.link)]
          : filteredArticles;
        const context = buildNewsReasoningContext(focusArticles, query, 5);
        const prompt = `You are analyzing current news from the app's curated RSS feeds.

Use ONLY the articles below as your source base unless you explicitly state that the current feed set does not answer the question.
Quote or reference the DIRECT ARTICLE URL when discussing a story.
If a story has a primary source listed, mention it.
Do not emit [ACTION: show_news]. Stay in analyst mode.
Be concise, neutral, and truth-seeking.
Format for a compact floating panel:
- start with the direct answer
- prefer short bullets or short paragraphs
- avoid long throat-clearing
- compare stories explicitly when relevant

ARTICLES:
${context}

USER QUESTION:
${userMessage}`;

        const reply = await chatWithTutor([], prompt);
        setChatMessages((prev) => [...prev, { role: "tutor", text: reply }]);
      } catch {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "tutor",
            text: "I couldn't process that news follow-up right now. Try again in a moment.",
          },
        ]);
      } finally {
        setIsChatLoading(false);
      }
    },
    [filteredArticles, isChatLoading, query],
  );

  const handleChatSubmit = useCallback(() => {
    const message = chatInput.trim();
    if (!message) {
      return;
    }

    setChatInput("");
    void sendNewsQuestion(message);
  }, [chatInput, sendNewsQuestion]);

  const handleChatInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowChat(false);
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleChatSubmit();
      }
    },
    [handleChatSubmit],
  );

  const sourceSummary = useMemo(() => {
    const loaded = new Set(filteredArticles.map((article) => article.source));
    return NEWS_SOURCES.filter((source) => loaded.has(source.name));
  }, [filteredArticles]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {hasBackgroundTask && onReturn ? <BackgroundTaskBanner onReturn={onReturn} /> : null}

      <section className="studio-panel overflow-hidden bg-white dark:bg-slate-950">
        <div className="border-b-2 border-[var(--aqs-border)]/5 bg-[linear-gradient(135deg,rgba(139,30,63,0.04),transparent)] px-5 py-8 md:px-8 lg:px-12">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {onReturn ? (
                  <button
                    type="button"
                    onClick={onReturn}
                    className="studio-card h-12 w-12 bg-white transition-all dark:bg-slate-900"
                    aria-label="Back to answer"
                  >
                    <ArrowLeft className="mx-auto h-5 w-5" />
                  </button>
                ) : null}
                <div className="neo-border-thin neo-shadow-sm flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-[var(--aqs-accent)] text-white">
                  <Newspaper className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                    Verified Editorial Desk
                  </p>
                  <h1 className="mt-2 max-w-4xl text-4xl font-black tracking-tighter text-[var(--aqs-ink)] dark:text-white md:text-5xl">
                    Truth-seeking <span className="text-[var(--aqs-accent)]">intelligence.</span>
                  </h1>
                </div>
              </div>
              <p className="max-w-4xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                A live research surface built from verified news feeds. Mike provides direct source links and primary evidence analysis.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <button
                type="button"
                onClick={() => setShowChat((value) => !value)}
                className={`studio-card px-6 py-4 text-sm font-black transition-all ${
                  showChat
                    ? "bg-[var(--aqs-accent)] text-white"
                    : "bg-white text-[var(--aqs-ink)] dark:bg-slate-900 dark:text-white"
                }`}
                aria-expanded={showChat}
                aria-controls="floating-news-chat"
              >
                <MessageCircle className="mr-2 inline h-5 w-5" />
                Desk Chat
              </button>
              <button
                type="button"
                onClick={() => void loadNews(query, true)}
                disabled={refreshing}
                className="studio-card bg-white px-6 py-4 text-sm font-black text-[var(--aqs-ink)] dark:bg-slate-900 dark:text-white"
              >
                <RefreshCw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh Feed
              </button>
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="studio-card bg-white px-6 py-4 text-sm font-black text-[var(--aqs-ink)] dark:bg-slate-900 dark:text-white"
                >
                  <X className="mr-2 inline h-4 w-4" />
                  Exit
                </button>
              ) : null}
            </div>
          </div>

          <form onSubmit={handleSearch} className="mt-10 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <span className="sr-only">Search the editorial feed</span>
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search the live feed for topics, entities, or events…"
                name="news-search"
                autoComplete="off"
                className="neo-border-thin studio-focus w-full rounded-[1.25rem] bg-white py-4 pl-14 pr-6 text-lg font-medium text-[var(--aqs-ink)] dark:bg-slate-950 dark:text-white"
              />
            </label>
            <button
              type="submit"
              className="neo-border neo-shadow inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[var(--aqs-accent)] px-8 py-4 text-base font-black text-white transition-all hover:-translate-y-1 active:translate-y-px"
            >
              Update Desk
            </button>
          </form>

          <div className="mt-8 flex flex-wrap gap-3">
            {NEWS_SOURCES.map((source) => (
              <SourceToggle
                key={source.name}
                active={selectedSources.has(source.name)}
                label={source.name}
                onClick={() => toggleSource(source.name)}
              />
            ))}
          </div>
        </div>

        <div className="p-5 md:p-8 lg:p-12">
          {loading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--aqs-border)]/5 border-t-[var(--aqs-accent)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Newspaper className="h-6 w-6 text-[var(--aqs-accent)]" />
                </div>
              </div>
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Syncing verified editorial feeds...</p>
            </div>
          ) : error ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 rounded-[2.2rem] border-2 border-[var(--aqs-border)]/10 bg-white p-10 dark:bg-slate-900">
              <p className="text-center text-xl font-bold text-[var(--aqs-ink)] dark:text-white">{error}</p>
              <button
                type="button"
                onClick={() => void loadNews(query, true)}
                className="neo-border neo-shadow inline-flex items-center gap-3 rounded-2xl bg-[var(--aqs-accent)] px-8 py-4 font-black text-white"
              >
                <RefreshCw className="h-5 w-5" />
                Retry Sync
              </button>
            </div>
          ) : filteredArticles.length === 0 || !leadArticle ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 rounded-[2.2rem] border-2 border-[var(--aqs-border)]/10 bg-white p-10 dark:bg-slate-900">
              <Newspaper className="h-12 w-12 text-slate-300" />
              <p className="text-center text-xl font-bold text-slate-500 dark:text-slate-400">
                No matching reports in the current desk set.
              </p>
            </div>
          ) : (
            <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-12">
                <LeadStory article={leadArticle} onAsk={(article) => void sendNewsQuestion(`Provide an essential analyst summary of: ${article.title}`, article)} />

                {deckArticles.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-[var(--aqs-border)]/5 pb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                          Expanded Coverage
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                          Primary reporting from same editorial context.
                        </p>
                      </div>
                      {selectedSources.size > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedSources(new Set())}
                          className="text-xs font-black uppercase tracking-widest text-[var(--aqs-accent-strong)] hover:underline dark:text-[var(--aqs-accent-dark)]"
                        >
                          Show All
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-6 sm:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]">
                      {deckArticles.map((article) => (
                        <StoryCard key={article.link} article={article} onAsk={(selectedArticle) => void sendNewsQuestion(`Summarize essential findings from this article.`, selectedArticle)} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="space-y-6 xl:sticky xl:top-6">
                  <div className="studio-card p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                      Latest Feed
                    </p>
                    <div className="mt-6 space-y-4">
                      {latestRail.map((article) => (
                        <LatestStory key={article.link} article={article} onAsk={(selectedArticle) => void sendNewsQuestion(`What matters most in this article?`, selectedArticle)} />
                      ))}
                    </div>
                  </div>

                  <div className="studio-card bg-slate-50/50 p-6 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                      <Rss className="h-4 w-4" />
                      Studio Intelligence
                    </div>
                    <div className="mt-6 space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                      <p>
                        Current set: <strong className="text-[var(--aqs-ink)] dark:text-white">{filteredArticles.length}</strong> verified reports.
                      </p>
                      <p>
                        Sources:{" "}
                        <span className="font-bold text-[var(--aqs-ink)] dark:text-white">{sourceSummary.map((source) => source.name).join(", ")}</span>
                      </p>
                      <p className="text-[11px] font-medium leading-relaxed text-slate-400">
                        Desk chat uses direct article text and surfaces primary evidence.
                      </p>
                      {hydrating ? (
                        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-950/80">
                          <RefreshCw className="h-4 w-4 animate-spin text-[var(--aqs-accent)]" />
                          <span className="text-xs font-bold text-slate-500">Enriching primary links...</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </aside>
            </div>
          )}
        </div>
      </section>

      {showChat ? (
        <div className="fixed inset-x-3 bottom-3 z-40 flex justify-end sm:inset-x-auto sm:bottom-6 sm:right-6">
          <section
            id="floating-news-chat"
            role="dialog"
            aria-label="News chat"
            className="studio-panel flex w-full flex-col bg-white p-0 backdrop-blur-xl dark:bg-slate-950 sm:w-[28rem]"
          >
              <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--aqs-border)]/5 bg-[var(--aqs-accent-soft)] px-6 py-6 dark:bg-[color:rgba(139,30,63,0.1)]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                    Analyst Desk Chat
                  </p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                    Ask for comparisons, evidence checks, or sourcing provenance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChat(false)}
                  className="studio-card h-10 w-10 bg-white dark:bg-slate-900"
                  aria-label="Close chat"
                >
                  <X className="mx-auto h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-hidden p-6">
                {chatMessages.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
                    <MessageCircle className="mx-auto h-12 w-12 text-slate-200 dark:text-slate-800" />
                    <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      "Compare the lead story with coverage from WSJ." <br/> "What primary evidence is cited for this event?"
                    </p>
                  </div>
                ) : (
                  <div className="scroll-studio max-h-[46vh] space-y-6 overflow-y-auto rounded-3xl bg-slate-50/50 p-4 dark:bg-slate-900/30">
                    {chatMessages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        <div
                          className={`max-w-[92%] rounded-[1.5rem] border-2 px-5 py-4 ${
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
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Processing Desk...</span>
                        </div>
                      </div>
                    ) : null}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleChatSubmit();
                  }}
                  className="space-y-4"
                >
                  <div className="neo-border-thin studio-focus rounded-2xl bg-white p-1 dark:bg-slate-950">
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Ask about the current feed set..."
                      aria-label="Ask about current articles"
                      name="news-chat"
                      autoComplete="off"
                      disabled={isChatLoading}
                      rows={3}
                      onKeyDown={handleChatInputKeyDown}
                      className="w-full resize-none bg-transparent px-4 py-3 text-base font-medium text-[var(--aqs-ink)] outline-none dark:text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Enter to Send Analysis</p>
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isChatLoading}
                      className="neo-border neo-shadow flex items-center gap-3 rounded-xl bg-[var(--aqs-accent)] px-6 py-3 text-sm font-black text-white transition-all hover:-translate-y-1 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      Ask Mike
                    </button>
                  </div>
                </form>
              </div>
            </section>
        </div>
      ) : null}
    </div>
  );
}
