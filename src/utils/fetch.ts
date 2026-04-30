/**
 * Shared fetch wrapper with timeout and consistent error handling.
 * Every fetch in the app should go through here for reliability.
 */

export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

export interface FetchJsonOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

/**
 * Fetch a URL and parse its JSON response.
 * Throws a user-readable Error on network failure, timeout, or bad status.
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, headers, method, body } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await globalThis.fetch(url, {
      method,
      body,
      signal: controller.signal,
      headers: { ...headers },
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const data = await response.json() as T;
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
