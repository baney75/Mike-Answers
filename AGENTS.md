# AGENTS.md

## Cursor Cloud specific instructions

### Overview

AnyQuestionSolver is a client-side React + Vite SPA that uses Google Gemini AI to solve academic questions. There is no backend server despite `express` and `better-sqlite3` being listed in `package.json` (unused AI Studio template artifacts).

### Running the app

- `bun dev` starts the Vite dev server on port 3000 (host 0.0.0.0)
- `bun build` creates a production build in `dist/`
- `bun lint` runs `tsc --noEmit` for type checking
- Tests: `bun test src/utils/image.test.ts` (uses Bun's built-in test runner)

### Environment

- Requires `GEMINI_API_KEY` in `.env.local` for AI functionality. Vite exposes it to client code via `import.meta.env.GEMINI_API_KEY` (configured in `vite.config.ts` via `envPrefix`).
- If `GEMINI_API_KEY` is available as a shell environment variable, write it to `.env.local` before starting the dev server: `echo "GEMINI_API_KEY=\"$GEMINI_API_KEY\"" > .env.local`
- `GOOGLE_API_KEY` can also be set for search/video functionality (falls back to GEMINI_API_KEY if not set)

### Gotchas

- The `.env.local` file is gitignored but required at runtime. Vite reads it automatically with the `envPrefix: ['VITE_', 'GEMINI_', 'GOOGLE_']` config.
- Changing `.env.local` requires restarting the Vite dev server for changes to take effect (not hot-reloaded).
- The app makes Gemini API calls directly from the browser (no server proxy), so the API key is exposed in the client bundle.
- The free-tier Gemini API key has strict per-model rate limits. If the pro model quota is exhausted, the chat feature (which uses a lighter model) should still work. Wait ~45s between requests if you hit rate limits.

---

## Code Quality Rules

### ALWAYS follow these rules when editing code:

1. **Type Safety**: All TypeScript code must pass `tsc --noEmit` without errors
2. **Accessibility**: 
   - All buttons must have `type="button"` 
   - Labels must be associated with inputs via `htmlFor` or wrapping
   - Interactive elements must be keyboard-accessible
   - No `aria-hidden` on focusable elements
3. **No Unused Code**: Remove unused imports, functions, variables, and files
4. **Imports**: Group imports: React -> external libraries -> internal modules -> types
5. **Component Structure**: Keep components small and focused; extract reusable logic to hooks
6. **State Management**: Use `useCallback` for handlers passed to children; include all dependencies
7. **Error Handling**: Always handle async errors with try/catch and user-friendly messages

### Linting

Run `bun lint` before committing. Fix ALL errors before pushing.

---

## Dynamic Image Search Protocol

**Goal:** Fulfill user requests for visuals (e.g., "Show me the Burj Khalifa") without incurring storage costs, while ensuring links do not break.

### Phase 1: Source Selection

When the user asks for an image, classify the request and choose the correct Tool/API:

| User Request Type | Example | Recommended Source | Why? |
| :--- | :--- | :--- | :--- |
| **Vibe / Generic** | "Show me a futuristic city", "A cute cat" | **Unsplash / Pexels API** | High quality, guaranteed hotlinking, free bandwidth. |
| **Specific Entity** | "Burj Khalifa", "Elon Musk", "iPhone 15" | **Google Custom Search API** | Finds exact real-world objects. |
| **Diagrams/UI** | "React Logo", "Flowchart icon" | **Local Assets / Base64** | (See ImageRenderer component) |

### Phase 2: Image Rendering

Use the `ImageRenderer` component for all external images:

```tsx
import { ImageRenderer } from './components/ImageRenderer';

// Usage with remote image
<ImageRenderer 
  src="https://images.unsplash.com/photo-xxx" 
  alt="Description of image" 
/>
```

The component:
- Uses `referrerPolicy="no-referrer"` to allow hotlinking from strict sites
- Shows loading skeleton while image loads
- Shows fallback UI if image fails to load
- Supports both local and remote images

### Phase 3: Video Rendering

Use the `VideoEmbed` component for YouTube videos:

```tsx
import { VideoEmbed } from './components/VideoEmbed';

// Usage
<VideoEmbed 
  videoId="dQw4w9WgXcQ" 
  title="Video Title"
  channelTitle="Channel Name"
/>
```

---

## Search Services

### Web Search

```tsx
import { searchWeb } from './services/search';

const results = await searchWeb('quantum physics explanation', 10);
// results.items - array of search results
// results.totalResults - total number of results
```

### Image Search

```tsx
import { searchImages } from './services/search';

const results = await searchImages('solar system diagram', 10);
// results.items[].image.url - image URL
```

### Video Search

```tsx
import { searchVideos, getYouTubeEmbedUrl } from './services/search';

const results = await searchVideos('calculus tutorial', 10);
// results.items[].videoId - YouTube video ID
// results.items[].thumbnail - thumbnail URL
```

---

## Gemini API Integration

### Research Mode with Grounding

The `research` mode uses Google Search grounding for real-time information:

```tsx
// In gemini.ts
if (mode === "research") {
  config.tools = [{ googleSearch: {} }];
}
```

Grounded responses include:
- `webSearchQueries` - search queries used
- `groundingChunks` - web sources with URIs and titles
- `groundingSupports` - citations linking text to sources

### Citation Format

When using grounded responses, format citations as:
```markdown
[1](https://example.com/source1), [2](https://example.com/source2)
```

---

## Voice Input

The Dropzone component supports voice input via Web Speech API:

```tsx
<Dropzone
  onImageSelected={handleImageSelected}
  onTextPasted={handleTextPasted}
  onError={handleError}
  onVoiceInput={handleTextPasted} // Voice input uses same handler
/>
```

Voice input:
- Works in Chrome and Edge (Web Speech API support required)
- Uses `en-US` language by default
- Falls back gracefully with error message if unsupported

---

## Favicon Prompt (for AI regeneration)

> A minimalist brain circuit icon, geometric style, indigo (#4F46E5) and white color scheme, on transparent background, clean vector lines, suitable for small sizes (16x16 to 512x512), modern and professional, slight glow effect, centered composition