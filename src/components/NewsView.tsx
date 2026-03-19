import { useEffect, useState, useCallback, useRef } from "react";
import {
  Newspaper,
  RefreshCw,
  ExternalLink,
  Loader2,
  Search,
  X,
  Clock,
  Filter,
  Rss,
  Send,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { fetchAllNews, fetchNewsForQuery, type NewsArticle, NEWS_SOURCES } from "../services/news";
import { chatWithTutor } from "../services/gemini";
import type { ChatMessage } from "../types";

interface NewsViewProps {
  initialQuery?: string;
  onClose?: () => void;
  onReturn?: () => void;
  hasBackgroundTask?: boolean;
}

function BackgroundTaskBanner({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="bg-amber-100 dark:bg-amber-900/30 border-b-2 border-amber-300 dark:border-amber-700 px-4 py-3 flex items-center justify-between gap-4">
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
  );
}

const SOURCE_COLORS: Record<string, string> = {
  "Straight Arrow News": "bg-blue-500",
  "Tangle": "bg-purple-500",
  "WSJ Tech": "bg-green-600",
  "WSJ World News": "bg-green-600",
  "WSJ US News": "bg-green-600",
  "NewsNation": "bg-orange-500",
  "The Center Square": "bg-red-600",
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return mins <= 1 ? "Just now" : `${mins} min ago`;
    }
    if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      return `${hours}h ago`;
    }
    if (diffHours < 48) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

function ArticleCard({ article }: { article: NewsArticle }) {
  const sourceColor = SOURCE_COLORS[article.source] || "bg-gray-500";
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group relative rounded-[1.4rem] border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-900 overflow-hidden neo-shadow transition-all duration-300 hover:-translate-y-1 hover:neo-shadow-md">
      {article.thumbnail && !imgError ? (
        <a href={article.link} target="_blank" rel="noopener noreferrer" className="block aspect-video overflow-hidden">
          <img
            src={article.thumbnail}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        </a>
      ) : (
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-video bg-gradient-to-br from-[var(--aqs-accent-soft)] to-[var(--aqs-accent)] flex items-center justify-center"
        >
          <Newspaper className="w-12 h-12 text-[var(--aqs-accent)] dark:text-[var(--aqs-accent-dark)] opacity-50" />
        </a>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider text-white ${sourceColor}`}
          >
            {article.source}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
            <Clock className="w-3 h-3" />
            {formatDate(article.pubDate)}
          </span>
        </div>

        <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-snug mb-2 line-clamp-3">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--aqs-accent)] dark:hover:text-[var(--aqs-accent-dark)] transition-colors"
          >
            {article.title}
          </a>
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 mb-3">
          {article.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          {article.author && (
            <span className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[60%]">
              {article.author}
            </span>
          )}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-bold text-[var(--aqs-accent)] dark:text-[var(--aqs-accent-dark)] hover:underline ml-auto"
          >
            Read More
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

function SourceFilter({
  selectedSources,
  onToggle,
}: {
  selectedSources: Set<string>;
  onToggle: (source: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {NEWS_SOURCES.map((source) => {
        const isSelected = selectedSources.has(source.name);
        return (
          <button
            key={source.name}
            type="button"
            onClick={() => onToggle(source.name)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              isSelected
                ? "bg-[var(--aqs-accent)] text-white neo-shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {source.name}
          </button>
        );
      })}
    </div>
  );
}

export function NewsView({ initialQuery = "", onClose, onReturn, hasBackgroundTask }: NewsViewProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const loadNews = useCallback(
    async (searchQuery: string, forceRefresh = false) => {
      setLoading(true);
      setError(null);
      if (forceRefresh) setRefreshing(true);

      try {
        let news: NewsArticle[];
        if (searchQuery.trim()) {
          news = await fetchNewsForQuery(searchQuery);
        } else {
          news = await fetchAllNews();
        }
        setArticles(news);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load news");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadNews(query);
  }, [query, loadNews]);

  useEffect(() => {
    if (chatMessages.length > prevMessagesLengthRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = chatMessages.length;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
  };

  const handleSourceToggle = (source: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading || articles.length === 0) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsChatLoading(true);
    setShowChat(true);

    try {
      const topArticles = articles.slice(0, 5);
      const articlesSummary = topArticles.map((a, i) => 
        `${i + 1}. "${a.title}" - ${a.source} (${formatDate(a.pubDate)}): ${a.description?.slice(0, 200) || ""}`
      ).join("\n");

      const combinedMessage = `You are a news assistant helping the user understand current events. Here are some of the latest headlines from trusted sources:

${articlesSummary}

Based on these articles, please answer the user's question below. Be informative, cite specific articles when relevant, and note if the articles don't cover the topic being asked about.

User question: ${userMessage}`;

      const reply = await chatWithTutor([], combinedMessage);
      setChatMessages((prev) => [...prev, { role: "tutor", text: reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        { role: "tutor", text: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, articles]);

  const filteredArticles =
    selectedSources.size > 0
      ? articles.filter((a) => selectedSources.has(a.source))
      : articles;

  return (
    <div className="min-h-screen animate-in fade-in duration-500 space-y-4">
      {hasBackgroundTask && onReturn && <BackgroundTaskBanner onReturn={onReturn} />}
      <div className="rounded-[2rem] border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-900 neo-shadow overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--aqs-accent)] to-[var(--aqs-accent-strong)] p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              {onReturn && (
                <button
                  type="button"
                  onClick={onReturn}
                  className="rounded-xl bg-white/20 p-2 text-white transition hover:bg-white/30"
                  title="Back to answer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="rounded-xl bg-white/20 p-3">
                <Newspaper className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Latest News
                </h1>
                <p className="text-white/70 text-sm mt-1">
                  Aggregated from trusted sources
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowChat(!showChat)}
                className={`rounded-xl bg-white/20 p-3 text-white transition hover:bg-white/30 ${showChat ? "bg-white text-[var(--aqs-accent)]" : ""}`}
                title="Chat about news"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => void loadNews(query, true)}
                disabled={refreshing}
                className="rounded-xl bg-white/20 p-3 text-white transition hover:bg-white/30 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-white/20 p-3 text-white transition hover:bg-white/30"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search news..."
                className="w-full rounded-xl border-2 border-white/30 bg-white/10 pl-12 pr-4 py-3 text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-4 focus:ring-white/20"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-white px-6 py-3 font-bold text-[var(--aqs-accent)] transition hover:-translate-y-0.5 hover:neo-shadow-sm"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-xl px-4 py-3 font-bold transition hover:-translate-y-0.5 hover:neo-shadow-sm ${
                showFilters ? "bg-white text-[var(--aqs-accent)]" : "bg-white/20 text-white"
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </form>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <Rss className="w-4 h-4 text-white/70" />
                <span className="text-sm text-white/70 font-medium">Filter by source:</span>
              </div>
              <SourceFilter selectedSources={selectedSources} onToggle={handleSourceToggle} />
            </div>
          )}
        </div>

        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-[var(--aqs-accent)]" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Loading latest news...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-gray-600 dark:text-gray-400 font-medium">{error}</p>
              <button
                type="button"
                onClick={() => void loadNews(query, true)}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-900 bg-white px-4 py-2 font-bold text-gray-900 transition hover:-translate-y-0.5 hover:bg-gray-50 neo-shadow-sm dark:border-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Newspaper className="w-12 h-12 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                No articles found. Try adjusting your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                  {filteredArticles.length} article{filteredArticles.length !== 1 ? "s" : ""}
                  {selectedSources.size > 0 && ` from ${selectedSources.size} source${selectedSources.size !== 1 ? "s" : ""}`}
                </p>
                {selectedSources.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSources(new Set())}
                    className="text-sm text-[var(--aqs-accent)] dark:text-[var(--aqs-accent-dark)] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article, index) => (
                  <ArticleCard key={`${article.link}-${index}`} article={article} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-mono text-gray-500 dark:text-gray-400">
            <span>Sources:</span>
            {NEWS_SOURCES.map((source) => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--aqs-accent)] dark:hover:text-[var(--aqs-accent-dark)] underline"
              >
                {source.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      {showChat && (
        <div className="rounded-[2rem] border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-900 neo-shadow overflow-hidden">
          <div className="bg-[var(--aqs-accent-soft)] dark:bg-[color:rgba(122,31,52,0.18)] border-b-2 border-gray-900 dark:border-gray-100 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--aqs-accent)] p-2">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                  News Assistant
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Ask about the latest news
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowChat(false)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 md:p-6 max-h-[400px] overflow-y-auto space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Ask me about the news!
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    "Summarize the top stories",
                    "What are the main topics today?",
                    "Tell me more about the first article",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setChatInput(suggestion)}
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
                placeholder="Ask about the news..."
                disabled={isChatLoading || articles.length === 0}
                className="flex-1 rounded-xl border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-[var(--aqs-accent)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(122,31,52,0.18)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading || articles.length === 0}
                className="rounded-xl bg-[var(--aqs-accent)] px-4 py-3 text-white transition hover:-translate-y-0.5 hover:neo-shadow disabled:opacity-50 disabled:transform-none"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
