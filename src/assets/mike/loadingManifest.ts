export const mikeLoadingArt = {
  churchill: new URL("./loading/churchill.webp", import.meta.url).href,
  philosophy: new URL("./loading/philosophy.webp", import.meta.url).href,
  gannon: new URL("./loading/gannon.webp", import.meta.url).href,
  chemistry: new URL("./loading/chemistry.webp", import.meta.url).href,
} as const;

export type MikeLoadingArtKey = keyof typeof mikeLoadingArt;
