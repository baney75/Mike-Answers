const GOOGLE_API_KEY = import.meta.env.GOOGLE_API_KEY || import.meta.env.GEMINI_API_KEY;
const SEARCH_ENGINE_ID = '017576662512468239146:2152321705'; // Public search engine ID

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  image?: {
    url: string;
    width: number;
    height: number;
  };
}

export interface VideoResult {
  title: string;
  videoId: string;
  thumbnail: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
}

export interface SearchResponse {
  items: SearchResult[];
  totalResults: number;
  searchTime: number;
}

export interface VideoSearchResponse {
  items: VideoResult[];
  totalResults: number;
}

interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  pagemap?: {
    cse_image?: Array<{ src?: string; width?: number; height?: number }>;
  };
  image?: {
    width?: number;
    height?: number;
  };
}

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
  searchInformation?: {
    totalResults?: string;
    formattedSearchTime?: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  pageInfo?: {
    totalResults?: number;
  };
}

export async function searchWeb(query: string, numResults = 10): Promise<SearchResponse> {
  if (!GOOGLE_API_KEY) {
    console.warn('Google API key not configured. Search disabled.');
    return { items: [], totalResults: 0, searchTime: 0 };
  }

  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    cx: SEARCH_ENGINE_ID,
    q: query,
    num: String(Math.min(numResults, 10)),
    safe: 'active',
  });

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params}`
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data: GoogleSearchResponse = await response.json();

  return {
    items: (data.items || []).map((item: GoogleSearchItem) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      image: item.pagemap?.cse_image?.[0] ? {
        url: String(item.pagemap.cse_image[0].src || ''),
        width: item.pagemap.cse_image[0].width || 0,
        height: item.pagemap.cse_image[0].height || 0,
      } : undefined,
    })),
    totalResults: Number(data.searchInformation?.totalResults) || 0,
    searchTime: Number(data.searchInformation?.formattedSearchTime) || 0,
  };
}

export async function searchImages(query: string, numResults = 10): Promise<SearchResponse> {
  if (!GOOGLE_API_KEY) {
    console.warn('Google API key not configured. Image search disabled.');
    return { items: [], totalResults: 0, searchTime: 0 };
  }

  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    cx: SEARCH_ENGINE_ID,
    q: query,
    num: String(Math.min(numResults, 10)),
    safe: 'active',
    searchType: 'image',
    imgSize: 'large',
    imgType: 'photo',
  });

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params}`
  );

  if (!response.ok) {
    throw new Error(`Image search failed: ${response.status}`);
  }

  const data: GoogleSearchResponse = await response.json();

  return {
    items: (data.items || []).map((item: GoogleSearchItem) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      image: {
        url: item.link,
        width: item.image?.width || 0,
        height: item.image?.height || 0,
      },
    })),
    totalResults: Number(data.searchInformation?.totalResults) || 0,
    searchTime: Number(data.searchInformation?.formattedSearchTime) || 0,
  };
}

export async function searchVideos(query: string, maxResults = 10): Promise<VideoSearchResponse> {
  if (!GOOGLE_API_KEY) {
    console.warn('Google API key not configured. Video search disabled.');
    return { items: [], totalResults: 0 };
  }

  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: String(Math.min(maxResults, 50)),
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`
  );

  if (!response.ok) {
    throw new Error(`Video search failed: ${response.status}`);
  }

  const data: YouTubeSearchResponse = await response.json();

  return {
    items: (data.items || []).map((item: YouTubeSearchItem) => ({
      title: item.snippet.title,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    })),
    totalResults: data.pageInfo?.totalResults || 0,
  };
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' = 'medium'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}