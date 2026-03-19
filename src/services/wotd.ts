/**
 * Word of the Day service using Merriam-Webster RSS feed via rss2json API.
 */

const WOTD_FEED_URL = "https://www.merriam-webster.com/wotd/feed/rss2";
const RSS2JSON_API = "https://api.rss2json.com/v1/api.json";

export interface WordOfTheDay {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  example?: string;
  date: string;
  audioUrl?: string;
  sourceUrl: string;
}

interface Rss2JsonItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content?: string;
  enclosure?: {
    link: string;
    type: string;
  };
}

interface Rss2JsonResponse {
  status: string;
  feed: {
    title: string;
    link: string;
    image?: string;
  };
  items: Rss2JsonItem[];
}

let cachedWotd: WordOfTheDay | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .trim();
}

function parseWotdItem(item: Rss2JsonItem): WordOfTheDay {
  const word = item.title.trim();

  const content = item.content || item.description;

  let phonetic: string | undefined;
  const phoneticMatch = content.match(/\\([A-Za-z\- ʃŋθð]+?)\\/);
  if (phoneticMatch) {
    phonetic = phoneticMatch[1].trim();
  }

  let partOfSpeech: string | undefined;
  const posMatch = content.match(/<em>([a-z]+)<\/em>/i);
  if (posMatch) {
    partOfSpeech = posMatch[1].toLowerCase();
  }

  let definition = "";
  const strippedContent = stripHtml(content);

  const refersMatch = strippedContent.match(/[Rr]efers?\s+to\s+[^.]+\./);
  if (refersMatch) {
    definition = word + " " + refersMatch[0].trim();
  } else {
    const sentences = strippedContent.split(/[.!?]+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && trimmed.length < 300 && 
          !trimmed.includes("Merriam-Webster") && 
          !trimmed.includes("Word of the Day") &&
          !trimmed.includes("Examples")) {
        definition = trimmed + ".";
        break;
      }
    }
  }

  if (definition.length > 500) {
    definition = definition.slice(0, 497) + "...";
  }

  let example: string | undefined;

  const slashExampleMatch = content.match(/<p>\s*\/\/\s*([^<]+)<\/p>/);
  if (slashExampleMatch) {
    const rawExample = slashExampleMatch[1];
    const emMatch = rawExample.match(/<em>[^<]*<\/em>\s*([^""<]+)/);
    if (emMatch) {
      example = emMatch[1].trim();
    } else {
      example = rawExample.replace(/<[^>]+>/g, "").trim();
    }
    if (example && !example.endsWith(".") && !example.endsWith('"')) {
      example = example.replace(/[""]$/, "") + '"';
    }
  }

  if (!example) {
    const exampleQuoteMatch = content.match(/<p>\s*[""]([^""]+)[""]\s*—/);
    if (exampleQuoteMatch) {
      example = exampleQuoteMatch[1].replace(/<[^>]+>/g, "").trim();
    }
  }

  if (example && example.length > 200) {
    example = example.slice(0, 197) + "...";
  }

  return {
    word,
    phonetic,
    partOfSpeech,
    definition,
    example,
    date: item.pubDate,
    audioUrl: item.enclosure?.link,
    sourceUrl: item.link,
  };
}

export async function getWordOfTheDay(forceRefresh = false): Promise<WordOfTheDay> {
  const now = Date.now();

  if (!forceRefresh && cachedWotd && now - cacheTime < CACHE_TTL) {
    return cachedWotd;
  }

  const response = await fetch(`${RSS2JSON_API}?rss_url=${encodeURIComponent(WOTD_FEED_URL)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch word of the day: ${response.status}`);
  }

  const data: Rss2JsonResponse = await response.json();

  if (data.status !== "ok" || !data.items?.length) {
    throw new Error("No word of the day found");
  }

  cachedWotd = parseWotdItem(data.items[0]);
  cacheTime = now;

  return cachedWotd;
}
