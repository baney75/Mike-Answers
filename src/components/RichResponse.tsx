import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import SmilesDrawer from "smiles-drawer";
import { ExternalLink } from "lucide-react";
import "katex/dist/katex.min.css";

import { CodeBlock } from "./CodeBlock";
import { ChartBlock } from "./ChartBlock";
import { DemoBlock } from "./DemoBlock";
import { FigureBlock } from "./FigureBlock";
import { ImageRenderer } from "./ImageRenderer";
import { StatBlock } from "./StatBlock";
import { TableBlock } from "./TableBlock";
import { VideoEmbed } from "./VideoEmbed";
import {
  getGoogleImageSearchUrl,
  fetchYouTubeTranscriptPreview,
  getYouTubeWatchUrl,
  getYouTubeSearchUrl,
  searchImages,
  searchVideos,
  searchWeb,
  type SearchResult,
  type VideoResult,
} from "../services/search";
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsSearchUrl, buildGoogleMapsStreetViewUrl } from "../services/maps";
import { getWeatherSnapshot } from "../services/weather";
import { extractEmbeddedSources } from "../utils/solution";
import type { SolutionSource } from "../types";

interface RichResponseProps {
  text: string;
  compact?: boolean;
}

type RichElementType = "image" | "video" | "definition" | "web" | "weather" | "map";

interface RichElement {
  type: RichElementType;
  id: string;
  content: string;
}

function scoreQueryMatch(query: string, ...fields: Array<string | undefined>) {
  const queryTerms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);

  const haystack = fields.join(" ").toLowerCase();
  return queryTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function chooseBestImageResult(query: string, items: SearchResult[]) {
  const highTrustHosts = [
    "wikimedia.org",
    "wikipedia.org",
    "britannica.com",
    "nasa.gov",
    "nih.gov",
    "nationalgeographic.com",
    "pbs.org",
    "reuters.com",
    "apnews.com",
    "unsplash.com",
    "pexels.com",
    "openverse.org",
  ];
  const lowTrustHosts = ["facebook.", "instagram.", "pinterest.", "tiktok.", "youtube.com"];
  const ranked = items
    .filter((item) => item.image?.url || item.link)
    .map((item) => {
      const url = item.image?.url || item.link;
      let score = scoreQueryMatch(query, item.title, item.snippet, item.displayLink, url);
      const width = item.image?.width || 0;
      const height = item.image?.height || 0;

      if (highTrustHosts.some((host) => item.displayLink.includes(host) || url.includes(host))) score += 3;
      if (lowTrustHosts.some((host) => item.displayLink.includes(host) || url.includes(host))) score -= 4;
      if (url.match(/\.(svg|gif)(\?|$)/i)) score -= 5;
      if (url.match(/logo|icon|sprite|avatar|thumbnail/i)) score -= 2;
      if (width >= 800 || height >= 800) score += 2;
      if (width > 0 && height > 0 && Math.min(width, height) < 250) score -= 3;
      if (item.title.toLowerCase().includes("stock photo")) score -= 1;

      return { item, score };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.item ?? null;
}

function chooseBestVideoResult(query: string, items: VideoResult[]) {
  const ranked = items
    .map((item) => {
      let score = scoreQueryMatch(query, item.title, item.description, item.channelTitle);

      if (/\bofficial\b/i.test(query) && /\bofficial|vevo|topic\b/i.test(`${item.title} ${item.channelTitle}`)) {
        score += 4;
      }
      if (/\blyric\b/i.test(item.title) && !/\blyric\b/i.test(query)) {
        score -= 3;
      }
      if (/\bshorts\b/i.test(item.title)) {
        score -= 2;
      }

      return { item, score };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.item ?? null;
}

function cleanVideoDescription(description: string) {
  return description
    .replace(/\s+/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .trim();
}

function formatVideoDate(dateString: string) {
  if (!dateString) {
    return "Recent upload date unavailable";
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return "Recent upload date unavailable";
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildVideoKeyPoints(query: string, video: VideoResult) {
  const cleanedDescription = cleanVideoDescription(video.description);
  const sentences = cleanedDescription
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);
  const queryTerms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  const matchedTerms = queryTerms.filter((term) =>
    `${video.title} ${cleanedDescription} ${video.channelTitle}`.toLowerCase().includes(term),
  );

  const points = [
    matchedTerms.length > 0
      ? `Best match for: ${matchedTerms.slice(0, 4).join(", ")}.`
      : `Selected because the title and channel align with “${query}”.`,
    sentences[0] || "Open the video to inspect the worked explanation in full context.",
    sentences[1] || `Watch for the core setup, formula choice, and worked example tied to ${query}.`,
  ];

  return points.slice(0, 3);
}

function SmilesRenderer({ smiles }: { smiles: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const renderSmiles = useCallback(() => {
    if (!canvasRef.current) return;

    try {
      const drawer = new SmilesDrawer({ width: 500, height: 300 });
      void drawer.draw(smiles, canvasRef.current, "light").then(() => {
        setRenderError(null);
      }).catch(() => {
        setRenderError("Could not draw the molecule structure.");
      });
    } catch {
      setRenderError("Could not parse the SMILES notation.");
    }
  }, [smiles]);

  useEffect(() => {
    renderSmiles();
  }, [renderSmiles]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(smiles);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  if (renderError) {
    return (
      <div className="my-4 rounded-xl border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg bg-red-100 dark:bg-red-900/30 px-4 py-2">
            <p className="text-sm font-mono text-red-700 dark:text-red-300">
              Could not render molecule structure
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <code className="rounded bg-gray-100 px-3 py-1.5 font-mono text-sm dark:bg-gray-800 dark:text-gray-200">
              {smiles}
            </code>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-gray-100 transition hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {copied ? "Copied!" : "Copy SMILES"}
              </button>
              <button
                type="button"
                onClick={renderSmiles}
                className="rounded-lg border-2 border-gray-900 dark:border-gray-100 bg-(--aqs-accent) px-3 py-1.5 text-xs font-bold text-white transition hover:bg-(--aqs-accent-strong)"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 flex flex-col items-center gap-3 overflow-x-auto rounded-xl border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <canvas ref={canvasRef} width={500} height={300} className="max-w-full" />
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-lg border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-gray-100 transition hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        {copied ? "Copied!" : "Copy SMILES"}
      </button>
    </div>
  );
}

function DefinitionCard({ content, compact = false }: { content: string; compact?: boolean }) {
  const lines = content.trim().split("\n");
  const wordLine = lines.find((line) => line.startsWith("**") && line.includes("/")) || lines[0] || "";
  const wordMatch = wordLine.match(/\*\*(.+?)\*\*/);
  const phoneticMatch = wordLine.match(/\/(.+?)\//);

  const word = wordMatch?.[1] || "Unknown";
  const phonetic = phoneticMatch?.[1] || "";

  const partsOfSpeech: Array<{ type: string; definitions: Array<{ def: string; example?: string }> }> = [];
  let currentPart: { type: string; definitions: Array<{ def: string; example?: string }> } | null = null;

  for (const line of lines.slice(1)) {
    if (line.startsWith("*") && line.endsWith("*")) {
      if (currentPart) partsOfSpeech.push(currentPart);
      currentPart = { type: line.slice(1, -1), definitions: [] };
      continue;
    }

    if (line.match(/^\d+\./) && currentPart) {
      const defMatch = line.match(/^\d+\.\s*(.+)/);
      if (defMatch) currentPart.definitions.push({ def: defMatch[1] });
      continue;
    }

    if (line.trim().startsWith("- Example:") && currentPart?.definitions.length) {
      const exampleMatch = line.match(/- Example:\s*["'](.+?)["']/);
      if (exampleMatch) {
        currentPart.definitions[currentPart.definitions.length - 1].example = exampleMatch[1];
      }
    }
  }

  if (currentPart) partsOfSpeech.push(currentPart);

  const synonymsMatch = content.match(/Synonyms:\s*(.+)/i);
  const synonyms = synonymsMatch?.[1]?.split(",").map((item) => item.trim()) || [];

  return (
    <div
      className={`neo-border neo-shadow my-6 rounded-3xl bg-amber-50 p-5 dark:bg-amber-950/20 ${
        compact ? "" : "md:p-8"
      }`}
    >
      <div className="mb-5 flex items-baseline gap-4">
        <h3 className={`${compact ? "text-2xl" : "text-3xl"} font-black text-gray-900 dark:text-gray-100`}>
          {word}
        </h3>
        {phonetic ? (
          <span className="font-mono text-lg font-medium text-amber-700/80 dark:text-amber-400/80">/{phonetic}/</span>
        ) : null}
      </div>

      <div className="space-y-6">
        {partsOfSpeech.map((part, index) => (
          <div key={`${part.type}-${index}`} className="relative">
            <span className="neo-border-thin mb-3 inline-block rounded-lg bg-amber-200 px-3 py-1 font-mono text-xs font-black uppercase text-amber-900 dark:bg-amber-800 dark:text-amber-100">
              {part.type}
            </span>
            <ol className="ml-4 list-outside list-decimal space-y-3">
              {part.definitions.map((definition, defIndex) => (
                <li key={`${part.type}-${defIndex}-${definition.def.slice(0, 24)}`} className="pl-2 text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                  <span className="text-lg">{definition.def}</span>
                  {definition.example ? (
                    <p className="mt-2 text-sm italic font-semibold text-amber-800/70 dark:text-amber-300/60">
                      &ldquo;{definition.example}&rdquo;
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {synonyms.length ? (
        <div className="mt-6 border-t-2 border-amber-200 pt-4 dark:border-amber-800/40">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <span className="font-black uppercase tracking-wider">Synonyms:</span> {synonyms.join(", ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ImageSearchResult({ query, compact = false }: { query: string; compact?: boolean }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadImage() {
      setLoading(true);
      setImageUrl(null);

      try {
        const imageResults = await searchImages(query, 6);
        let bestResult = chooseBestImageResult(query, imageResults.items);

        if (!bestResult) {
          const webResults = await searchWeb(query, 6);
          bestResult = chooseBestImageResult(query, webResults.items);
        }

        if (active) {
          setImageUrl(bestResult?.image?.url || bestResult?.link || null);
        }
      } catch {
        if (active) {
          setImageUrl(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadImage();

    return () => {
      active = false;
    };
  }, [query]);

  if (loading) {
    if (compact) {
      return (
        <div className="my-4 rounded-[1.1rem] border border-(--aqs-ink)/8 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:border-white/8 dark:bg-slate-900 dark:text-slate-300">
          Finding image
        </div>
      );
    }

    return (
      <div className="neo-border-thin my-6 flex h-48 items-center justify-center rounded-2xl bg-gray-100 p-6 text-sm font-bold uppercase tracking-widest text-gray-500 dark:bg-gray-800">
        Finding image...
      </div>
    );
  }

  if (!imageUrl) {
    if (compact) {
      return (
        <div className="my-4 rounded-[1.2rem] border border-(--aqs-ink)/8 bg-slate-50 px-4 py-3 dark:border-white/8 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                Image unavailable
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                No stable preview for &quot;{query}&quot;.
              </p>
            </div>
            <a
              href={getGoogleImageSearchUrl(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-[0.95rem] border border-(--aqs-ink)/8 bg-white px-3.5 py-2 text-xs font-black text-(--aqs-ink) transition hover:bg-slate-50 dark:border-white/8 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
            >
              Search images
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="neo-border-thin neo-shadow-sm my-6 rounded-[1.35rem] bg-gray-100 p-5 dark:bg-gray-800">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">
            Image Unavailable
          </div>
          <div className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            Could not resolve a stable preview for &quot;{query}&quot;.
          </div>
          <a
            href={getGoogleImageSearchUrl(query)}
            target="_blank"
            rel="noopener noreferrer"
            className="neo-border-thin neo-shadow-sm mt-4 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-50 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            Search Images
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "my-4" : "my-6"}>
      <ImageRenderer src={imageUrl} alt={query} compact={compact} className="neo-border neo-shadow-sm rounded-[1.8rem]" />
    </div>
  );
}

function VideoSearchResult({ query, compact = false }: { query: string; compact?: boolean }) {
  const [video, setVideo] = useState<VideoResult | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadVideo() {
      setLoading(true);
      setVideo(null);
      setTranscriptPreview(null);

      try {
        const results = await searchVideos(query, 6);
        const bestVideo = chooseBestVideoResult(query, results.items);
        if (active) {
          setVideo(bestVideo);
        }
      } catch {
        if (active) {
          setVideo(null);
          setTranscriptPreview(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadVideo();

    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    let active = true;

    async function loadTranscript() {
      if (!video) {
        setTranscriptPreview(null);
        return;
      }

      try {
        const transcript = await fetchYouTubeTranscriptPreview(video.videoId);
        if (active) {
          setTranscriptPreview(transcript);
        }
      } catch {
        if (active) {
          setTranscriptPreview(null);
        }
      }
    }

    void loadTranscript();

    return () => {
      active = false;
    };
  }, [video]);

  if (loading) {
    return (
      <div className="neo-border-thin my-6 rounded-[1.8rem] bg-gray-50 p-6 dark:bg-slate-900/40">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
          <div className="aspect-video animate-pulse rounded-2xl border-2 border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800" />
          <div className="space-y-4">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="neo-border neo-shadow-sm my-6 rounded-[1.8rem] bg-gray-50 p-6 dark:bg-slate-900/40">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
          <div>
            <span className="patch">Video Search</span>
            <h3 className="mt-4 text-xl font-black leading-tight text-gray-900 dark:text-white">
              No stable preview for &quot;{query}&quot;.
            </h3>
            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              The app could not resolve a reliable embeddable YouTube hit. The result is still usable if you open search directly and pick a credible channel.
            </p>
          </div>

          <div className="neo-border-thin rounded-2xl bg-white p-5 dark:bg-[#230f18] dark:ring-1 dark:ring-white/10">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Best Next Move</div>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
              Open YouTube search, choose a worked example from a credible channel, then ask a follow-up about that specific video.
            </p>
            <a
              href={getYouTubeSearchUrl(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="neo-border-thin neo-shadow-sm mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white py-3 text-sm font-black text-gray-900 transition hover:bg-gray-50 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              Search YouTube
            </a>
          </div>
        </div>
      </div>
    );
  }

  const cleanedDescription = cleanVideoDescription(video.description);
  const keyPoints = buildVideoKeyPoints(query, video);
  const transcriptOrNotes = transcriptPreview
    ? transcriptPreview.slice(0, compact ? 180 : 360)
    : cleanedDescription.slice(0, compact ? 160 : 320);
  const watchUrl = getYouTubeWatchUrl(video.videoId);

  return (
    <div className={compact ? "my-4" : "my-6"}>
      <div className={`grid gap-6 ${compact ? "" : "xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]"}`}>
        <div className="neo-border neo-shadow-sm overflow-hidden rounded-[2rem]">
          <VideoEmbed videoId={video.videoId} title={video.title} channelTitle={video.channelTitle} compact={compact} />
        </div>

        <aside className="neo-border-thin rounded-[1.8rem] bg-gray-50 p-5 dark:bg-slate-900/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="patch">Video Brief</span>
              <h3 className="mt-3 text-lg font-black leading-snug text-gray-900 dark:text-white">
                {video.title}
              </h3>
            </div>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="neo-border-thin neo-shadow-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white transition hover:bg-(--aqs-accent-soft) dark:bg-[#230f18] dark:ring-1 dark:ring-white/10 dark:hover:bg-[#2e1420]"
            >
              <ExternalLink className="h-4 w-4 text-(--aqs-accent)" />
            </a>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>{video.channelTitle || "YouTube"}</span>
            <span className="opacity-30">•</span>
            <span>{formatVideoDate(video.publishedAt)}</span>
          </div>

          <div className="mt-5 space-y-3">
            {keyPoints.map((point) => (
              <div key={point} className="neo-border-thin rounded-xl bg-white px-4 py-3 text-sm font-medium leading-relaxed text-slate-700 dark:bg-[#230f18] dark:ring-1 dark:ring-white/10 dark:text-slate-300">
                {point}
              </div>
            ))}
          </div>

          <div className="neo-border-thin mt-5 rounded-2xl bg-white p-4 dark:bg-[#230f18] dark:ring-1 dark:ring-white/10">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Transcript Preview</div>
            <p className="scroll-panel mt-3 max-h-48 overflow-y-auto pr-2 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              {transcriptOrNotes
                ? `${transcriptOrNotes}${
                    (transcriptPreview ? transcriptPreview.length : cleanedDescription.length) > transcriptOrNotes.length ? "..." : ""
                  }`
                : "No public caption track was available."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function WebSearchResult({ query, compact = false }: { query: string; compact?: boolean }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadResults() {
      setLoading(true);
      setResults([]);
      setError(null);

      try {
        const response = await searchWeb(query, compact ? 2 : 3);
        if (active) {
          setResults(response.items.slice(0, compact ? 2 : 3));
        }
      } catch (searchError) {
        if (active) {
          setError(searchError instanceof Error ? searchError.message : "Web search was unavailable.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      active = false;
    };
  }, [compact, query]);

  if (loading) {
    return (
      <div className="neo-border-thin my-6 flex h-24 items-center justify-center rounded-2xl bg-gray-100 text-sm font-bold uppercase tracking-widest text-gray-500 dark:bg-gray-800">
        Loading links...
      </div>
    );
  }

  if (error) {
    return (
      <div className="neo-border-thin my-6 rounded-2xl bg-rose-50 px-5 py-4 text-sm font-medium leading-relaxed text-rose-700 dark:bg-rose-950/20 dark:text-rose-200">
        Web search unavailable. {error}
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="neo-border-thin my-6 rounded-2xl bg-gray-50 px-5 py-4 text-sm font-medium leading-relaxed text-gray-600 dark:bg-gray-900 dark:text-gray-300">
        No web results found for this query.
      </div>
    );
  }

  return (
    <div className={`my-6 grid gap-4 ${compact ? "" : "md:grid-cols-2 xl:grid-cols-3"}`}>
      {results.map((result) => (
        <a
          key={result.link}
          href={result.link}
          target="_blank"
          rel="noopener noreferrer"
          className="neo-border-thin neo-shadow-sm rounded-[1.6rem] bg-white p-5 text-left transition-all hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_var(--aqs-border)] dark:bg-[#230f18] dark:ring-1 dark:ring-white/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="line-clamp-2 text-lg font-black leading-tight text-gray-900 dark:text-white">
                {result.title}
              </div>
              <div className="mt-2 font-mono text-[10px] font-black uppercase tracking-widest text-slate-400">{result.displayLink}</div>
            </div>
            <div className="neo-border-thin flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--aqs-accent-soft) dark:bg-[#1a0b12] dark:ring-1 dark:ring-white/10">
              <ExternalLink className="h-4 w-4 text-(--aqs-accent)" />
            </div>
          </div>
          <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">{result.snippet}</p>
        </a>
      ))}
    </div>
  );
}

function WeatherResult({ query, compact = false }: { query: string; compact?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getWeatherSnapshot>>>(null);

  useEffect(() => {
    let active = true;

    async function loadWeather() {
      setLoading(true);
      setError(null);

      try {
        const result = await getWeatherSnapshot(query);
        if (active) {
          setSnapshot(result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Weather lookup failed.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadWeather();
    return () => {
      active = false;
    };
  }, [query]);

  if (loading) {
    return (
      <div className="neo-border-thin my-6 h-48 animate-pulse rounded-[1.8rem] bg-gray-100 dark:bg-gray-800" />
    );
  }

  if (!snapshot || error) {
    return (
      <div className="neo-border-thin my-6 rounded-[1.8rem] bg-gray-50 p-6 dark:bg-slate-900/40">
        <span className="patch">Weather Brief</span>
        <h3 className="mt-4 text-xl font-black text-gray-900 dark:text-white">Lookup unavailable for “{query}”.</h3>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">{error ?? "Try a more specific city or region name."}</p>
      </div>
    );
  }

  return (
    <section className="neo-border neo-shadow-sm my-8 rounded-[2rem] bg-white p-6 dark:bg-[#230f18] dark:ring-1 dark:ring-white/10">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="patch">Local Weather</span>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-(--aqs-ink) dark:text-white">
            {snapshot.location.name}
            {snapshot.location.admin1 ? `, ${snapshot.location.admin1}` : ""}
          </h3>
          <p className="mt-2 font-mono text-[10px] font-black uppercase tracking-widest text-slate-400">
            {snapshot.sourceLabel} <span className="mx-2 opacity-30">•</span> {new Date(snapshot.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <a
          href={buildGoogleMapsSearchUrl(
            `${snapshot.location.name}${snapshot.location.admin1 ? ` ${snapshot.location.admin1}` : ""}`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="neo-border-thin neo-shadow-sm flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-(--aqs-ink) transition-all hover:-translate-y-0.5 active:translate-y-px dark:bg-slate-900 dark:text-white"
        >
          Map View
          <ExternalLink className="h-4 w-4 text-(--aqs-accent)" />
        </a>
      </div>

      <div className={`mt-8 grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {[
          { label: "Temp", value: `${snapshot.temperatureC.toFixed(1)}°C` },
          { label: "Feels", value: `${snapshot.apparentTemperatureC.toFixed(1)}°C` },
          { label: "Wind", value: `${snapshot.windSpeedKph.toFixed(0)} km/h` },
        ].map((stat) => (
          <div key={stat.label} className="neo-border-thin rounded-2xl bg-(--aqs-paper-strong) p-5 dark:bg-slate-900">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
            <div className="mt-2 text-2xl font-black text-(--aqs-ink) dark:text-white">{stat.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MapResult({ query }: { query: string }) {
  return (
    <section className="neo-border neo-shadow-sm my-8 rounded-[2rem] bg-(--aqs-paper) p-6 dark:bg-slate-900">
      <span className="patch">Map Brief</span>
      <h3 className="mt-4 text-xl font-black text-(--aqs-ink) dark:text-white">{query}</h3>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Search Map", url: buildGoogleMapsSearchUrl(query) },
          { label: "Directions", url: buildGoogleMapsDirectionsUrl(query) },
          { label: "Street View", url: buildGoogleMapsStreetViewUrl(query) },
        ].map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="neo-border-thin neo-shadow-sm flex items-center justify-center rounded-2xl bg-white py-4 text-sm font-black text-(--aqs-ink) transition-all hover:-translate-y-1 active:translate-y-px dark:bg-[#230f18] dark:ring-1 dark:ring-white/10 dark:text-white"
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}

function SourcesPanel({ sources, compact = false }: { sources: SolutionSource[]; compact?: boolean }) {
  if (!sources.length) {
    return null;
  }

  if (compact) {
    return (
      <div className="mt-5 grid gap-3">
        {sources.map((source) => (
          <a
            key={`${source.index}-${source.url}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="neo-border-thin rounded-xl bg-white px-3 py-2 transition-all hover:-translate-y-0.5 active:translate-y-px dark:bg-slate-900"
          >
            <div className="font-bold text-gray-900 dark:text-gray-100">
              <span className="text-(--aqs-accent)">[{source.index}]</span> {source.title}
            </div>
            <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {source.category} <span className="mx-1 opacity-30">•</span> {source.host}
            </div>
          </a>
        ))}
      </div>
    );
  }

  return (
    <section className="neo-border mb-10 rounded-[1.8rem] bg-(--aqs-accent-soft) p-6 dark:bg-[#1a0b12] dark:ring-1 dark:ring-white/10">
      <div className="mb-6 flex flex-col gap-2">
        <h3 className="text-xl font-black tracking-tight text-(--aqs-ink) dark:text-white">
          Verified Sources
        </h3>
        <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
          Automatically filtered toward official, scholarly, and high-trust reporting sources.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <a
            key={`${source.index}-${source.url}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="neo-border-thin neo-shadow-sm rounded-2xl bg-white p-4 text-left transition-all hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_var(--aqs-border)] dark:bg-[#230f18] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.2)] dark:border-[#4a1829]"
          >
            <div className="flex items-start gap-4">
              <span className="neo-border-thin flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--aqs-accent-soft-strong) font-mono text-sm font-black text-(--aqs-accent-strong) dark:border-white/20 dark:bg-[#3f1322] dark:text-white">
                {source.index}
              </span>
              <div className="min-w-0">
                <div className="text-base font-bold leading-6 text-gray-900 dark:text-gray-100">
                  {source.title}
                </div>
                <div className="mt-2 font-mono text-xs font-bold text-slate-500 uppercase tracking-widest dark:text-slate-400">{source.host}</div>
                <div className="mt-2">
                  <span className="patch dark:bg-[#4a1829] dark:text-[#f0a3b6] dark:border-[#64112a] dark:shadow-none">
                    {source.category}
                  </span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function processRichText(text: string): {
  processed: string;
  elements: RichElement[];
  sources: SolutionSource[];
} {
  const { body, sources } = extractEmbeddedSources(text);
  const elements: RichElement[] = [];
  let processed = body;
  let idCounter = 0;

  const replaceMarker = (kind: RichElementType, prefix: string, tokens: string[]) => {
    for (const token of tokens) {
      const pattern = new RegExp(`\\[${token}:\\s*(?:"([^"]+)"|([^\\]]+))\\]`, "g");
      processed = processed.replace(pattern, (_, quoted, bare) => {
        const query = String(quoted ?? bare ?? "").trim();
        if (!query) {
          return "";
        }

        const id = `${prefix}-${idCounter++}`;
        elements.push({ type: kind, id, content: query });
        return `\n\n__${tokens[0]}_MARKER_${id}__\n\n`;
      });
    }
  };

  replaceMarker("image", "img", ["IMAGE_SEARCH", "IMAGE"]);
  replaceMarker("video", "vid", ["VIDEO_SEARCH", "VIDEO"]);
  replaceMarker("web", "web", ["WEB_SEARCH", "WEB"]);
  replaceMarker("weather", "weather", ["WEATHER"]);
  replaceMarker("map", "map", ["MAP"]);

  processed = processed.replace(/\[DEFINITION\]([\s\S]*?)\[END_DEFINITION\]/g, (_, content) => {
    const id = `def-${idCounter++}`;
    elements.push({ type: "definition", id, content: content.trim() });
    return `\n\n__DEFINITION_MARKER_${id}__\n\n`;
  });

  processed = processed
    .replace(/\[IMAGE_SEARCH:[^\]]*\]/g, "")
    .replace(/\[IMAGE:[^\]]*\]/g, "")
    .replace(/\[VIDEO_SEARCH:[^\]]*\]/g, "")
    .replace(/\[VIDEO:[^\]]*\]/g, "")
    .replace(/\[WEB_SEARCH:[^\]]*\]/g, "")
    .replace(/\[WEB:[^\]]*\]/g, "")
    .replace(/\[WEATHER:[^\]]*\]/g, "")
    .replace(/\[MAP:[^\]]*\]/g, "")
    .replace(/\[ACTION:[^\]]*\]/g, "")
    .replace(/\[DEFINITION\](?!(\s|\S)*\[END_DEFINITION\])/g, "")
    .replace(/\[END_DEFINITION\]/g, "");

  return { processed, elements, sources };
}

export function RichResponse({ text, compact = false }: RichResponseProps) {
  const { processed, elements, sources } = useMemo(() => processRichText(text), [text]);

  const parts = useMemo(() => {
    const result: Array<{ type: RichElementType | "markdown"; content: string; id?: string }> = [];
    const markerRegex =
      /__(IMAGE_SEARCH_MARKER_|VIDEO_SEARCH_MARKER_|WEB_SEARCH_MARKER_|WEATHER_MARKER_|MAP_MARKER_|DEFINITION_MARKER_)([^_]+)__/g;
    let lastIndex = 0;
    let match = markerRegex.exec(processed);

    while (match !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "markdown", content: processed.slice(lastIndex, match.index) });
      }

      const id = match[2];
      const element = elements.find((entry) => entry.id === id);
      if (element) {
        result.push({ type: element.type, content: element.content, id });
      }

      lastIndex = markerRegex.lastIndex;
      match = markerRegex.exec(processed);
    }

    if (lastIndex < processed.length) {
      result.push({ type: "markdown", content: processed.slice(lastIndex) });
    }

    return result;
  }, [elements, processed]);

  const proseClass = compact
    ? "prose prose-sm max-w-none text-[16px] leading-8 text-slate-800 dark:prose-invert dark:text-slate-100 prose-p:my-4 prose-p:leading-8 prose-headings:mb-4 prose-headings:mt-6 prose-headings:break-words prose-headings:font-sans prose-headings:font-black prose-strong:text-slate-900 dark:prose-strong:text-white prose-ul:my-4 prose-ul:pl-6 prose-ol:my-4 prose-ol:pl-6 prose-li:my-2 prose-li:leading-8 prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:bg-white dark:prose-pre:bg-slate-950 prose-pre:border-2 prose-pre:border-(--aqs-border) prose-pre:rounded-2xl prose-blockquote:border-l-[6px] prose-blockquote:border-(--aqs-accent) prose-blockquote:bg-(--aqs-accent-soft) prose-blockquote:px-6 prose-blockquote:py-3 dark:prose-blockquote:bg-[#1a0b12] dark:prose-blockquote:ring-1 dark:prose-blockquote:ring-white/10 prose-a:text-(--aqs-accent) dark:prose-a:text-(--aqs-accent-dark) prose-a:font-bold prose-a:underline prose-a:underline-offset-4"
    : "prose prose-lg prose-gray max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:bg-white dark:prose-pre:bg-slate-950 prose-pre:text-gray-900 dark:prose-pre:text-gray-100 prose-pre:border-[3px] prose-pre:border-(--aqs-border) prose-pre:rounded-[1.8rem] prose-pre:neo-shadow prose-headings:break-words prose-headings:font-sans prose-headings:font-black prose-headings:tracking-tight prose-headings:text-(--aqs-ink) prose-h1:text-[clamp(2.35rem,9vw,4.5rem)] prose-h1:leading-[0.95] dark:prose-headings:text-white prose-a:text-(--aqs-accent) dark:prose-a:text-(--aqs-accent-dark) prose-a:font-black prose-a:underline prose-a:underline-offset-4 prose-table:block prose-table:max-w-full prose-table:overflow-x-auto prose-table:border-[3px] prose-table:border-(--aqs-border) prose-table:rounded-2xl prose-th:border-b-[3px] prose-th:border-(--aqs-border) prose-th:bg-(--aqs-paper-strong) dark:prose-th:bg-slate-900 prose-td:border-b-2 prose-td:border-slate-100 dark:prose-td:border-slate-800";

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.type === "image") {
          return <ImageSearchResult key={part.id || `img-${index}`} query={part.content} compact={compact} />;
        }

        if (part.type === "video") {
          return <VideoSearchResult key={part.id || `vid-${index}`} query={part.content} compact={compact} />;
        }

        if (part.type === "web") {
          return <WebSearchResult key={part.id || `web-${index}`} query={part.content} compact={compact} />;
        }

        if (part.type === "weather") {
          return <WeatherResult key={part.id || `weather-${index}`} query={part.content} compact={compact} />;
        }

        if (part.type === "map") {
          return <MapResult key={part.id || `map-${index}`} query={part.content} />;
        }

        if (part.type === "definition") {
          return <DefinitionCard key={part.id || `def-${index}`} content={part.content} compact={compact} />;
        }

        return (
          <div key={`md-${index}`} className={proseClass}>
            <Markdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code(props) {
                  const { children, className, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : "";
                  const content = String(children).replace(/\n$/, "");

                  if (language === "smiles") {
                    return <SmilesRenderer smiles={content} />;
                  }

                  if (language === "chart") {
                    return <ChartBlock json={content} />;
                  }

                  if (language === "stats") {
                    return <StatBlock json={content} />;
                  }

                  if (language === "table") {
                    return <TableBlock json={content} />;
                  }

                  if (language === "figure") {
                    return <FigureBlock json={content} />;
                  }

                  if (language === "demo") {
                    return <DemoBlock json={content} />;
                  }

                  if (language) {
                    return <CodeBlock code={content} language={language} />;
                  }

                  return (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  );
                },
                pre({ children }) {
                  return <>{children}</>;
                },
              }}
            >
              {part.content}
            </Markdown>
          </div>
        );
      })}

      <SourcesPanel sources={sources} compact={compact} />
    </div>
  );
}
