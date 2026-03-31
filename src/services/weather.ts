export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export interface WeatherSnapshot {
  location: WeatherLocation;
  temperatureC: number;
  apparentTemperatureC: number;
  windSpeedKph: number;
  weatherCode: number;
  fetchedAt: string;
  sourceLabel: string;
  alertHeadline?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }>;
}

interface OpenMeteoForecastResponse {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    wind_speed_10m: number;
    weather_code: number;
    time: string;
  };
}

interface NwsAlertsResponse {
  features?: Array<{
    properties?: {
      headline?: string;
    };
  }>;
}

function isUsLocation(location: WeatherLocation) {
  return location.country?.toLowerCase().includes("united states") ?? false;
}

export async function geocodeLocation(query: string): Promise<WeatherLocation | null> {
  const params = new URLSearchParams({ name: query.trim(), count: "1", language: "en", format: "json" });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Geocoding failed (${response.status}).`);
  }

  const payload = (await response.json()) as OpenMeteoGeocodingResponse;
  const match = payload.results?.[0];
  if (!match) {
    return null;
  }

  return {
    name: match.name,
    latitude: match.latitude,
    longitude: match.longitude,
    country: match.country,
    admin1: match.admin1,
  };
}

export async function getWeatherSnapshot(query: string): Promise<WeatherSnapshot | null> {
  const location = await geocodeLocation(query);
  if (!location) {
    return null;
  }

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: ["temperature_2m", "apparent_temperature", "wind_speed_10m", "weather_code"].join(","),
    forecast_days: "1",
  });

  const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!forecastResponse.ok) {
    throw new Error(`Forecast lookup failed (${forecastResponse.status}).`);
  }

  const forecast = (await forecastResponse.json()) as OpenMeteoForecastResponse;
  const current = forecast.current;
  if (!current) {
    return null;
  }

  let alertHeadline: string | undefined;
  if (isUsLocation(location)) {
    try {
      const nwsResponse = await fetch(
        `https://api.weather.gov/alerts/active?point=${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`,
        { headers: { Accept: "application/geo+json" } },
      );
      if (nwsResponse.ok) {
        const nwsPayload = (await nwsResponse.json()) as NwsAlertsResponse;
        alertHeadline = nwsPayload.features?.[0]?.properties?.headline;
      }
    } catch {
      // NWS is best-effort only.
    }
  }

  return {
    location,
    temperatureC: current.temperature_2m,
    apparentTemperatureC: current.apparent_temperature,
    windSpeedKph: current.wind_speed_10m,
    weatherCode: current.weather_code,
    fetchedAt: current.time,
    sourceLabel: alertHeadline ? "Open-Meteo + NWS alerts" : "Open-Meteo",
    alertHeadline,
  };
}
