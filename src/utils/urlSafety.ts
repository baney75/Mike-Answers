function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isLoopbackHost(hostname: string) {
  const normalized = hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function toNormalizedUrl(parsed: URL) {
  parsed.hash = "";
  return trimTrailingSlash(parsed.toString());
}

export function normalizeExternalUrl(value: string, baseUrl?: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    if (parsed.username || parsed.password) {
      return "";
    }
    return toNormalizedUrl(parsed);
  } catch {
    return "";
  }
}

export function normalizeProviderBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Base URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Base URL must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Base URL must use http or https.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Base URL must not include embedded credentials.");
  }

  if (parsed.protocol === "http:" && !isLoopbackHost(parsed.hostname)) {
    throw new Error("Remote provider URLs must use https. Plain http is only allowed for localhost.");
  }

  return toNormalizedUrl(parsed);
}

export function getProviderBaseUrlError(value: string) {
  try {
    normalizeProviderBaseUrl(value);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid base URL.";
  }
}
