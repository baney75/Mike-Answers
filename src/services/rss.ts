/**
 * Lightweight RSS/Atom feed parser using native DOMParser.
 * Works in browser environment without external dependencies.
 */

export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  author?: string;
  thumbnail?: string;
  source?: string;
}

export interface RssFeed {
  title: string;
  link: string;
  description?: string;
  items: RssItem[];
  source?: string;
}

function extractText(el: Element | null, tag: string): string {
  if (!el) return "";
  const node = el.querySelector(tag);
  return node?.textContent?.trim() || "";
}

function extractAttribute(el: Element | null, tag: string, attr: string): string {
  if (!el) return "";
  const node = el.querySelector(tag);
  return node?.getAttribute(attr) || "";
}

function extractThumbnail(item: Element): string | undefined {
  const enclosure = item.querySelector("enclosure[type^='image']");
  if (enclosure?.getAttribute("url")) {
    return enclosure.getAttribute("url") || undefined;
  }

  const mediaContent = item.querySelector("media\\:content, content");
  if (mediaContent?.getAttribute("url")) {
    return mediaContent.getAttribute("url") || undefined;
  }

  const mediaThumbnail = item.querySelector("media\\:thumbnail, thumbnail");
  if (mediaThumbnail?.getAttribute("url")) {
    return mediaThumbnail.getAttribute("url") || undefined;
  }

  const description = extractText(item, "description");
  const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) {
    return imgMatch[1];
  }

  return undefined;
}

export function parseRss(xml: string, sourceName?: string): RssFeed {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const items: RssItem[] = [];

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid RSS/Atom feed");
  }

  const channelEl = doc.querySelector("channel") || doc.documentElement;
  const channel = channelEl as Element;
  const feedTitle = extractText(channel, "title") || sourceName || "Feed";
  const feedLink = extractText(channel, "link") || "";

  const itemElements = doc.querySelectorAll("item, entry");

  itemElements.forEach((item) => {
    const title = extractText(item, "title");
    const link = extractAttribute(item, "link", "href") || 
                 item.querySelector("link")?.textContent?.trim() || 
                 extractText(item, "link");
    
    let description = extractText(item, "description") || 
                     extractText(item, "content\\:encoded") ||
                     extractText(item, "content") ||
                     extractText(item, "summary") || "";
    
    description = description.replace(/<[^>]+>/g, "").trim();
    if (description.length > 300) {
      description = description.slice(0, 297) + "...";
    }

    const pubDate = extractText(item, "pubDate") || 
                    extractText(item, "published") ||
                    extractText(item, "updated") ||
                    extractText(item, "dc\\:date");

    const author = extractText(item, "author") || 
                  extractText(item, "dc\\:creator") ||
                  extractText(item, "creator");

    const thumbnail = extractThumbnail(item);

    if (title && link) {
      items.push({ title, link, description, pubDate, author, thumbnail, source: sourceName });
    }
  });

  return { title: feedTitle, link: feedLink, items, source: sourceName };
}

const CORS_PROXY = "https://api.codetabs.com/v1/proxy?quest=";

export async function fetchFeed(url: string, sourceName?: string): Promise<RssFeed> {
  const proxyUrl = CORS_PROXY + encodeURIComponent(url);
  const response = await fetch(proxyUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseRss(xml, sourceName);
}
