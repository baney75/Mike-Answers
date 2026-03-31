const MAPS_BASE = "https://www.google.com/maps";

export function buildGoogleMapsSearchUrl(query: string) {
  const params = new URLSearchParams({ api: "1", query: query.trim() });
  return `${MAPS_BASE}/search/?${params.toString()}`;
}

export function buildGoogleMapsDirectionsUrl(destination: string, origin?: string) {
  const params = new URLSearchParams({
    api: "1",
    destination: destination.trim(),
  });

  if (origin?.trim()) {
    params.set("origin", origin.trim());
  }

  return `${MAPS_BASE}/dir/?${params.toString()}`;
}

export function buildGoogleMapsStreetViewUrl(query: string) {
  const params = new URLSearchParams({ api: "1", map_action: "pano", query: query.trim() });
  return `${MAPS_BASE}/search/?${params.toString()}`;
}
