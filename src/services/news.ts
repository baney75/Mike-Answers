/**
 * News feed aggregation service using multiple RSS sources via rss2json API.
 * Sources are fetched in parallel and deduplicated.
 */

const RSS2JSON_API = "https://api.rss2json.com/v1/api.json";

export interface NewsArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  thumbnail?: string;
  source: string;
  sourceUrl: string;
}

const NEWS_SOURCES: Array<{ name: string; url: string }> = [
  { name: "Straight Arrow News", url: "https://san.com/feed/" },
  { name: "Tangle", url: "https://www.readtangle.com/archive/rss/" },
  { name: "WSJ Tech", url: "https://feeds.content.dowjones.io/public/rss/RSSWSJD" },
  { name: "WSJ World News", url: "https://feeds.content.dowjones.io/public/rss/RSSWorldNews" },
  { name: "WSJ US News", url: "https://feeds.content.dowjones.io/public/rss/RSSUSnews" },
  { name: "NewsNation", url: "https://www.newsnationnow.com/feed/" },
  { name: "The Center Square", url: "https://www.thecentersquare.com/search/?f=rss&t=article&l=20&s=start_time&fulltext=showtext&sd=desc" },
];

interface Rss2JsonItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  author?: string;
  thumbnail?: string;
  enclosure?: {
    link: string;
    type: string;
  };
}

interface Rss2JsonFeed {
  status: string;
  feed: {
    title: string;
    link: string;
    image?: string;
  };
  items: Rss2JsonItem[];
}

function parseNewsItem(item: Rss2JsonItem, sourceName: string): NewsArticle {
  let thumbnail = item.thumbnail;
  if (!thumbnail && item.enclosure?.type?.startsWith("image")) {
    thumbnail = item.enclosure.link;
  }

  const description = item.description
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: item.title || "",
    link: item.link || "",
    description: description.length > 300 ? description.slice(0, 297) + "..." : description,
    pubDate: item.pubDate || new Date().toISOString(),
    author: item.author,
    thumbnail,
    source: sourceName,
    sourceUrl: item.link || "",
  };
}

function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = `${article.title.toLowerCase().slice(0, 80)}|${article.link}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function sortByDate(articles: NewsArticle[]): NewsArticle[] {
  return articles.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    return isNaN(dateA) || isNaN(dateB) ? 0 : dateB - dateA;
  });
}

async function fetchSource(source: { name: string; url: string }): Promise<NewsArticle[]> {
  try {
    const response = await fetch(`${RSS2JSON_API}?rss_url=${encodeURIComponent(source.url)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data: Rss2JsonFeed = await response.json();
    if (data.status !== "ok" || !data.items) {
      return [];
    }
    return data.items.map((item) => parseNewsItem(item, source.name));
  } catch (err) {
    console.warn(`Failed to fetch from ${source.name}:`, err);
    return [];
  }
}

export async function fetchAllNews(options?: {
  topics?: string[];
  maxArticles?: number;
}): Promise<NewsArticle[]> {
  const { maxArticles = 50 } = options || {};

  const results = await Promise.all(NEWS_SOURCES.map(fetchSource));
  const allArticles = results.flat();

  const deduplicated = deduplicateArticles(allArticles);
  const sorted = sortByDate(deduplicated);

  return sorted.slice(0, maxArticles);
}

export async function fetchNewsForQuery(
  query: string,
  maxArticles = 20
): Promise<NewsArticle[]> {
  const allNews = await fetchAllNews({ maxArticles: 100 });

  const queryTerms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length > 2);

  if (queryTerms.length === 0) {
    return allNews.slice(0, maxArticles);
  }

  const scored = allNews.map((article) => {
    const searchText = `${article.title} ${article.description} ${article.source}`.toLowerCase();
    const score = queryTerms.reduce((acc, term) => {
      return acc + (searchText.includes(term) ? 1 : 0);
    }, 0);
    return { article, score };
  });

  const filtered = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article);

  return filtered.slice(0, maxArticles);
}

export { NEWS_SOURCES };
