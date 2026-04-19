export const mikeAssetManifest = {
  emblem: {
    png: new URL("./processed/emblem/mike-emblem.png?v=6", import.meta.url).href,
    webp: new URL("./processed/emblem/mike-emblem.webp?v=6", import.meta.url).href,
  },
  icon: {
    app192: "/android-chrome-192x192.png?v=6",
    app512: "/android-chrome-512x512.png?v=6",
    maskable512: "/android-chrome-maskable-512x512.png?v=6",
    favicon16: "/favicon-16x16.png?v=6",
    favicon32: "/favicon-32x32.png?v=6",
  },
  heroes: {
    general: {
      png: new URL("./processed/hero/general.png?v=6", import.meta.url).href,
      webp: new URL("./processed/hero/general.webp?v=6", import.meta.url).href,
    },
    mathematics: {
      png: new URL("./processed/hero/mathematics.png?v=6", import.meta.url).href,
      webp: new URL("./processed/hero/mathematics.webp?v=6", import.meta.url).href,
    },
    physics: {
      png: new URL("./processed/hero/physics.png?v=6", import.meta.url).href,
      webp: new URL("./processed/hero/physics.webp?v=6", import.meta.url).href,
    },
    chemistry: {
      png: new URL("./processed/hero/chemistry.png?v=6", import.meta.url).href,
      webp: new URL("./processed/hero/chemistry.webp?v=6", import.meta.url).href,
    },
    history: {
      png: new URL("./processed/hero/history.png?v=6", import.meta.url).href,
      webp: new URL("./processed/hero/history.webp?v=6", import.meta.url).href,
    },
    philosophy: {
      png: new URL("./processed/hero/philosophy.png?v=6", import.meta.url).href,
      webp: new URL("./processed/hero/philosophy.webp?v=6", import.meta.url).href,
    },
  },
} as const;

export type MikeAssetSubject = keyof typeof mikeAssetManifest.heroes;
