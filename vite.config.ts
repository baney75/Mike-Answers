import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: "auto",
      registerType: "prompt",
      includeAssets: [
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png",
        "android-chrome-192x192.png",
        "android-chrome-512x512.png",
        "android-chrome-maskable-512x512.png",
      ],
      devOptions: {
        enabled: true,
      },
      manifest: {
        id: "/",
        name: "Mike Answers",
        short_name: "Mike",
        description:
          "Private, bring-your-own-key AI for strong answers, current research, screenshots, voice, and clear learning.",
        lang: "en-US",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display_override: ["window-controls-overlay", "standalone", "browser"],
        display: "standalone",
        background_color: "#f8f0e7",
        theme_color: "#7a1f34",
        categories: ["education", "productivity", "utilities"],
        shortcuts: [
          {
            name: "Ask Mike",
            short_name: "Ask",
            url: "/",
            description: "Open the main solve workspace",
          },
          {
            name: "Daily Desk",
            short_name: "Desk",
            url: "/?scene=daily-desk",
            description: "Open the daily desk brief",
          },
          {
            name: "Settings",
            short_name: "Settings",
            url: "/?scene=settings",
            description: "Open provider settings quickly",
          },
        ],
        icons: [
          {
            src: "android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "android-chrome-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: "/",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === "image" ||
              request.destination === "style" ||
              request.destination === "script" ||
              request.destination === "font",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "mike-answers-static",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
            },
          },
        ],
      },
    }),
  ],
  // Expose GEMINI_* and GOOGLE_* env vars to client code via import.meta.env
  envPrefix: ['VITE_', 'GEMINI_', 'GOOGLE_'],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          const [, packagePath = ''] = id.split('node_modules/');
          const segments = packagePath.split('/');
          const packageName = segments[0]?.startsWith('@')
            ? `${segments[0]}/${segments[1]}`
            : segments[0];

          if (
            packageName === 'react-markdown' ||
            packageName === 'unified' ||
            packageName === 'hastscript' ||
            packageName.startsWith('remark-') ||
            packageName.startsWith('rehype-') ||
            packageName.startsWith('micromark') ||
            packageName.startsWith('mdast-') ||
            packageName.startsWith('hast-') ||
            packageName.startsWith('unist-') ||
            packageName.startsWith('vfile')
          ) {
            return 'vendor-markdown';
          }

          if (packageName === 'katex') {
            return 'vendor-katex';
          }

          if (packageName === '@google/genai') {
            return 'vendor-gemini';
          }

          if (packageName === 'qrcode' || packageName === 'html5-qrcode') {
            return 'vendor-transfer';
          }

          if (packageName === 'lucide-react') {
            return 'vendor-icons';
          }

          if (packageName === 'react' || packageName === 'react-dom' || packageName === 'scheduler') {
            return 'vendor-react';
          }

          if (packageName === 'smiles-drawer') {
            return 'vendor-smiles';
          }

          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
