import { normalizeExternalUrl } from "../utils/urlSafety";

const VERSE_API_URL = "https://beta.ourmanna.com/api/v1/get/?format=json&order=daily";
const VERSE_CACHE_TTL_MS = 1000 * 60 * 60;
const VERSE_FETCH_TIMEOUT_MS = 10_000;

export interface VerseOfTheDay {
  text: string;
  reference: string;
  version: string;
  sourceUrl: string;
  sourceLabel: string;
  notice?: string;
  copyrightNotice?: string;
}

interface VerseApiResponse {
  verse?: {
    details?: {
      text?: string;
      reference?: string;
      version?: string;
      verseurl?: string;
    };
    notice?: string;
  };
}

let cachedVerse: VerseOfTheDay | null = null;
let cacheTime = 0;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeVerseSourceUrl(value: string) {
  const normalized = normalizeExternalUrl(normalizeWhitespace(value)) || "https://ourmanna.com/";

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === "http:" && /(^|\.)ourmanna\.com$/i.test(parsed.hostname)) {
      parsed.protocol = "https:";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // Fall through to the normalized fallback below.
  }

  return normalized;
}

function buildCopyrightNotice(version: string, sourceNotice: string) {
  const normalizedVersion = version.trim().toUpperCase();

  if (normalizedVersion.includes("NIV")) {
    return "NIV text shown in-app via the OurManna Verse of the Day feed. Copyright remains with Biblica, Inc.";
  }

  return sourceNotice || "Verse text shown in-app via the OurManna Verse of the Day feed.";
}

export function parseVerseResponse(payload: VerseApiResponse): VerseOfTheDay {
  const details = payload.verse?.details;
  const text = normalizeWhitespace(details?.text ?? "");
  const reference = normalizeWhitespace(details?.reference ?? "");

  if (!text || !reference) {
    throw new Error("No verse of the day was returned.");
  }

  return {
    text,
    reference,
    version: normalizeWhitespace(details?.version ?? "NIV"),
    sourceUrl: normalizeVerseSourceUrl(details?.verseurl ?? "https://ourmanna.com/"),
    sourceLabel: "OurManna Verse of the Day feed",
    notice: normalizeWhitespace(payload.verse?.notice ?? ""),
    copyrightNotice: buildCopyrightNotice(
      normalizeWhitespace(details?.version ?? "NIV"),
      normalizeWhitespace(payload.verse?.notice ?? ""),
    ),
  };
}

async function fetchVerseOfTheDayFromApi() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), VERSE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(VERSE_API_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch verse of the day (${response.status}).`);
    }

    return parseVerseResponse((await response.json()) as VerseApiResponse);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function getVerseOfTheDay(forceRefresh = false): Promise<VerseOfTheDay> {
  const now = Date.now();
  if (!forceRefresh && cachedVerse && now - cacheTime < VERSE_CACHE_TTL_MS) {
    return cachedVerse;
  }

  cachedVerse = await fetchVerseOfTheDayFromApi();
  cacheTime = now;
  return cachedVerse;
}
