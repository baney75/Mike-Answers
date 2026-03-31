export const mikeAssetManifest = {
  emblem: {
    png: new URL("./processed/emblem/mike-emblem.png", import.meta.url).href,
    webp: new URL("./processed/emblem/mike-emblem.webp", import.meta.url).href,
  },
  icon: {
    app192: "/android-chrome-192x192.png",
    app512: "/android-chrome-512x512.png",
    maskable512: "/android-chrome-maskable-512x512.png",
    favicon16: "/favicon-16x16.png",
    favicon32: "/favicon-32x32.png",
  },
  heroes: {
    general: {
      png: new URL("./processed/hero/general.png", import.meta.url).href,
      webp: new URL("./processed/hero/general.webp", import.meta.url).href,
    },
    mathematics: {
      png: new URL("./processed/hero/mathematics.png", import.meta.url).href,
      webp: new URL("./processed/hero/mathematics.webp", import.meta.url).href,
    },
    physics: {
      png: new URL("./processed/hero/physics.png", import.meta.url).href,
      webp: new URL("./processed/hero/physics.webp", import.meta.url).href,
    },
    chemistry: {
      png: new URL("./processed/hero/chemistry.png", import.meta.url).href,
      webp: new URL("./processed/hero/chemistry.webp", import.meta.url).href,
    },
    history: {
      png: new URL("./processed/hero/history.png", import.meta.url).href,
      webp: new URL("./processed/hero/history.webp", import.meta.url).href,
    },
    philosophy: {
      png: new URL("./processed/hero/philosophy.png", import.meta.url).href,
      webp: new URL("./processed/hero/philosophy.webp", import.meta.url).href,
    },
  },
} as const;

export type MikeAssetSubject = keyof typeof mikeAssetManifest.heroes;
