# AGENTS.md

> **For full project architecture and patterns, see [ARCHITECTURE.md](./ARCHITECTURE.md)**
> 
> **⚠️ IMPORTANT**: When making significant changes to the codebase (new features, refactoring, new services, changed patterns), you MUST update `ARCHITECTURE.md` to reflect those changes. This document is the single source of truth for agents to understand the codebase—keeping it accurate prevents cascading mistakes as the codebase evolves.

## Cursor Cloud specific instructions

### Overview

AnyQuestionSolver is a client-side React + Vite SPA for academic help. It accepts typed questions, pasted text, screenshots, and follow-up chat prompts, then calls Google Gemini directly from the browser. There is no backend server.

### Product behavior

- Default path: text entry submits with the `fast` model when the user presses `Enter`
- `Shift+Enter` inserts a new line in the text composer
- Text pasted outside an editable field opens preview/options; text pasted into the textarea should stay in the textarea
- Image uploads and pasted screenshots go to preview first
- Voice input should transcribe into preview so the user can confirm/edit before sending if needed
- If an image or pasted text already shows a worked solution or partial attempt, the app should proactively check that work and continue tutoring without a separate "grade my work" mode
- Preview options should stay limited to `fast` and `deep`; grounded/source-backed research is automatic when the question requires it
- Grounded answers should render sources in the app's custom source-card UI, not as a raw markdown dump
- Rich responses may include inline media markers for images, videos, definitions, and curated link blocks; those markers must render in both the main answer and follow-up replies
- Solved screens and follow-up chat should expose retry/edit affordances in the app's existing maroon neo-shadow style, not browser-default UI

### Running the app

- `bun install` installs dependencies
- `bun dev` starts the Vite dev server on port `3000` with host `0.0.0.0`
- `bun run build` creates a production build in `dist/`
- `bun lint` runs `tsc --noEmit`
- `bun test src/utils/image.test.ts src/utils/input.test.ts src/utils/solution.test.ts src/services/gemini.test.ts` runs the current Bun unit tests

### Verification requirements

After code changes, run all of the following unless the task makes one impossible:

- `bun lint`
- `bun test src/utils/image.test.ts src/utils/input.test.ts src/utils/solution.test.ts src/services/gemini.test.ts`
- `bun run build`

If UI code changed, also smoke-test the app in a browser and check for:

- console errors
- broken keyboard behavior
- clipped or overlapping layouts at mobile and desktop widths
- missing focus states

### Environment

- Requires `GEMINI_API_KEY` in `.env.local` for AI functionality
- Optional model overrides:
  - `GEMINI_FAST_MODEL`
  - `GEMINI_GROUNDED_MODEL`
  - `GEMINI_PRO_MODEL`
- `GOOGLE_API_KEY` is optional for Google-backed web/video search features
- Image rendering has public fallbacks (Openverse and Wikimedia), so image cards should still try to render even when `GOOGLE_API_KEY` is missing or Google image search is unavailable
- Vite exposes these values via `import.meta.env` because `vite.config.ts` uses `envPrefix: ['VITE_', 'GEMINI_', 'GOOGLE_']`

If `GEMINI_API_KEY` already exists in the shell, write `.env.local` with:

```bash
echo 'GEMINI_API_KEY="'"$GEMINI_API_KEY"'"' > .env.local
```

### Gotchas

- `.env.local` is required at runtime and is not hot-reloaded; restart `bun dev` after changing it
- The Gemini key is shipped to the client bundle in this architecture
- Rate limits happen quickly on free tiers; if `deep` or `research` hits quota, retry with `fast`
- The app auto-upgrades to grounded or Pro-tier model routing for source-sensitive or complex prompts, so a `fast` click does not always mean the cheapest model was used
- Media search falls back across multiple search paths when possible; if live images/videos still do not resolve, check `GOOGLE_API_KEY`, API enablement, and quota before changing UI code
- KaTeX styles are already bundled through npm imports; do not add redundant CDN stylesheets in `index.html`
- Prefer `%BASE_URL%...` paths for static icons and manifests in `index.html`
- The Web Speech API still depends on browser support and microphone permission. Test voice on real Chrome/Edge over `localhost` or HTTPS.

---

## Code Quality Rules

### ALWAYS follow these rules when editing code:

1. **Type Safety**: All TypeScript code must pass `tsc --noEmit` without errors
2. **Accessibility**:
   - All buttons must have `type="button"`
   - Labels must be associated with inputs via `htmlFor` or wrapping
   - Interactive elements must be keyboard-accessible
   - No `aria-hidden` on focusable elements
3. **No Unused Code**: Remove unused imports, functions, variables, dead UI paths, and template artifacts
4. **Imports**: Group imports as React -> external libraries -> internal modules -> types
5. **Component Structure**: Keep components focused; extract reusable logic when a component starts carrying multiple responsibilities
6. **State Management**: Prefer functional state updates whenever the next value depends on the current value
7. **Error Handling**: Handle async failures with `try/catch` and user-friendly messages
8. **Helpful UX First**: Prefer proactive behavior over extra toggles and modes when the user intent can be inferred safely

### Current UX expectations

- `fast` is the primary CTA and the default quick-submit path
- `deep` is for longer walkthroughs, not a separate product branch
- Grounded, source-backed answers should be triggered automatically for prompts that ask for current information, citations, evidence, or research
- When grounding is active, prefer `.edu`, `.gov`, peer-reviewed, official, and other academically credible sources
- For scholarly questions, rank peer-reviewed journals, universities, government agencies, and primary research above general web pages
- For news/current-events questions, rank Reuters, AP, BBC, PBS, NPR, and primary official statements above commentary or opinion-heavy outlets
- Treat tertiary references like Wikipedia/Britannica and advocacy or think-tank sources as fallback-only, not preferred evidence
- Do not reintroduce a dedicated "grade my work" feature unless the user explicitly asks for it

---

## Dynamic Image Search Protocol

**Goal:** Fulfill user requests for visuals without local storage overhead while keeping rendering resilient.

### Phase 1: Source Selection

When the user asks for an image, classify the request and choose the correct source:

| User Request Type | Example | Recommended Source | Why? |
| :--- | :--- | :--- | :--- |
| **Vibe / Generic** | "Show me a futuristic city", "A cute cat" | **Unsplash / Pexels API** | High-quality, stable hotlinking. |
| **Specific Entity** | "Burj Khalifa", "Elon Musk", "iPhone 15" | **Google Custom Search API** | More precise for real-world entities. |
| **Diagrams / UI** | "React logo", "Flowchart icon" | **Local assets / generated markup** | Better control and reliability. |

### Phase 2: Image Rendering

Use the `ImageRenderer` component for remote images:

```tsx
import { ImageRenderer } from './components/ImageRenderer';

<ImageRenderer src="https://images.unsplash.com/photo-xxx" alt="Description of image" />
```

The component:

- uses `referrerPolicy="no-referrer"`
- shows a loading skeleton
- shows a fallback if the image fails
- supports both remote and local sources

### Phase 3: Video Rendering

Use the `VideoEmbed` component for YouTube videos:

```tsx
import { VideoEmbed } from './components/VideoEmbed';

<VideoEmbed
  videoId="dQw4w9WgXcQ"
  title="Video Title"
  channelTitle="Channel Name"
/>
```

---

## Word of the Day (Merriam-Webster)

The app has a built-in Word of the Day feature powered by Merriam-Webster's RSS feed via rss2json API.

### When to Use

- User asks for "word of the day", "daily word", or similar
- User asks for vocabulary/definition of the day
- User wants to learn a new word
- User asks about etymology or word origins

### How to Invoke

```tsx
import { getWordOfTheDay } from './services/wotd';

// Fetch current word of the day (cached for 1 hour)
const wotd = await getWordOfTheDay();
// Returns: { word, phonetic, partOfSpeech, definition, example, date, sourceUrl }
```

### Rendering

The `WordOfTheDay` component displays the word with:
- Word title (large, bold)
- Phonetic pronunciation (if available)
- Part of speech badge
- Definition in styled card
- Example usage (if available)
- Source link to Merriam-Webster

### Component Usage

```tsx
import { WordOfTheDay } from './components/WordOfTheDay';

// In idle state or when user requests word of the day
<WordOfTheDay onClose={resetAll} />
```

---

## News Aggregation

The app aggregates news from multiple trusted, unbiased RSS sources via rss2json API.

### Approved News Sources

| Source | URL | Bias | Notes |
|--------|-----|------|-------|
| Straight Arrow News | san.com/feed/ | Center | Original reporting |
| Tangle | readtangle.com/archive/rss/ | Center | Curated summaries |
| WSJ Tech | feeds.content.dowjones.io/public/rss/RSSWSJD | Center-Right | Tech news |
| WSJ World News | feeds.content.dowjones.io/public/rss/RSSWorldNews | Center-Right | World events |
| WSJ US News | feeds.content.dowjones.io/public/rss/RSSUSnews | Center-Right | US news |
| NewsNation | newsnationnow.com/feed/ | Center | Original reporting |
| The Center Square | thecentersquare.com/... | Center-Right | State-level news |

### When to Use

- User asks for "news", "latest news", "current events"
- User asks about something happening now
- User asks about a topic that requires recent information
- User asks "what happened" about any topic

### Source Selection Policy

**For unbiased news:**
- Primary: Straight Arrow News, NewsNation (original reporting, no opinion)
- Secondary: Tangle (curated, balanced summaries)
- Tertiary: WSJ, The Center Square (quality journalism with acknowledged lean)
- **NEVER use**: Opinion-only sites, single-source viral content, or unnamed sources

### How to Fetch News

```tsx
import { fetchAllNews, fetchNewsForQuery, NEWS_SOURCES } from './services/news';

// Fetch all latest news (auto-deduplicated, sorted by date)
const articles = await fetchAllNews({ maxArticles: 50 });

// Fetch news filtered by query
const articles = await fetchNewsForQuery('climate change', 20);
```

### News Article Structure

```tsx
interface NewsArticle {
  title: string;       // Article headline
  link: string;        // Direct link to source (PRIMARY SOURCE)
  description: string; // Brief excerpt
  pubDate: string;     // ISO date string
  author?: string;     // Reporter name if available
  thumbnail?: string;   // Article image if available
  source: string;      // Source name (e.g., "Straight Arrow News")
  sourceUrl: string;   // Same as link - direct to source
}
```

### Rendering with NewsView Component

```tsx
import { NewsView } from './components/NewsView';

// Full news view with search and filtering
<NewsView 
  initialQuery="technology"  // Optional: pre-filtered
  onClose={resetAll} 
/>
```

### Agent Instructions for News

When agents need to fetch and display news:

1. **Fetch from multiple sources**: Use `fetchAllNews()` to get aggregated content
2. **Always cite primary sources**: Link directly to the original article, not aggregators
3. **Verify before presenting**: Check that articles are recent (within 24-48 hours)
4. **Present sources transparently**: Show which outlet published each story
5. **For follow-up questions**: Use `fetchNewsForQuery(term)` to get topic-specific news
6. **Filter by source if needed**: Users can filter by source in the NewsView UI

**Example agent flow for news:**
```
User: "What's the latest news on AI regulation?"

Agent:
1. Call fetchNewsForQuery("AI regulation", 10)
2. Filter for most recent (within 48 hours)
3. Cite each story with direct links to original source
4. Present in NewsView component with thumbnails
5. Note: "These stories are from [source], [source], and [source]"
```

---

## Search Services

### Web Search

```tsx
import { searchWeb } from './services/search';

const results = await searchWeb('quantum physics explanation', 10);
```

### Image Search

```tsx
import { searchImages } from './services/search';

const results = await searchImages('solar system diagram', 10);
```

### Video Search (Enhanced)

The app uses YouTube for educational video content. Videos should be relevant, from credible channels, and support the user's learning.

**When to suggest videos:**
- User asks for "video", "tutorial", "how to", "explainer"
- User wants visual learning (diagrams, experiments, processes)
- User asks about something best demonstrated visually
- User asks for "see example", "watch", "demonstration"

**Video source preference (academic):**
1. Khan Academy, MIT OpenCourseWare, Crash Course
2. PBS, NOVA, National Geographic
3. University channels (Stanford, MIT, Harvard lectures)
4. Verified educational creators with expertise
5. Official organizational channels (NASA, NIH, NSF)

**Avoid:** Reaction content, unverified tutorials, clickbait

### How to Search and Render Videos

```tsx
import { searchVideos } from './services/search';
import { VideoEmbed } from './components/VideoEmbed';

// Search for relevant videos
const results = await searchVideos('machine learning tutorial', 6);

// results.items[0] gives you: { videoId, title, description, channelTitle, thumbnailUrl }

// Render with VideoEmbed
<VideoEmbed
  videoId={results.items[0].videoId}
  title={results.items[0].title}
  channelTitle={results.items[0].channelTitle}
/>
```

### VideoEmbed Component Features

- Lazy-loaded thumbnail preview
- Play button overlay
- Title and channel attribution
- Responsive sizing
- Accessible controls
- Dark mode compatible

### Agent Instructions for Videos

1. **Query specificity**: Use descriptive queries ("photosynthesis Khan Academy" not "photosynthesis")
2. **Channel verification**: Prefer verified educational channels
3. **Relevance ranking**: Consider:
   - Duration (shorter for quick answers, longer for deep dives)
   - View count (indicates popularity/quality)
   - Upload date (prefer recent for fast-moving topics)
4. **Fallback**: If video unavailable, provide direct YouTube search link
5. **Presentation**: Always show title, channel, and duration

---

## Gemini API Integration

### Automatic Grounding

Google Search grounding should be enabled automatically when the prompt asks for citations, current information, evidence, or research-backed claims:

```tsx
if (questionNeedsGrounding) {
  config.tools = [{ googleSearch: {} }];
}
```

### Citation Format

When using grounded responses:

```markdown
[1], [2], [3]
```

The app should render the full source list in its own source-card layout using grounding metadata, not raw markdown links at the bottom.
The source-selection policy should be intent-aware:

- scholarly / academic prompts: journals, universities, government, official institutions
- news / current events: Reuters, AP, BBC, PBS, NPR, and primary official statements
- proxy/aggregator hosts should be normalized back to the real source when possible before scoring or display
- reject or heavily down-rank forums, homework mills, anonymous Q&A, and opinion-first sources unless nothing better exists

### Media Markers

Gemini responses may emit these client-rendered markers:

```markdown
[IMAGE_SEARCH: "descriptive image query"]
[VIDEO_SEARCH: "descriptive YouTube query"]
[WEB_SEARCH: "descriptive web query"]
```

The renderer should:

- resolve the best live result it can find
- fall back cleanly to an external search link instead of a broken placeholder
- keep these markers out of copied text and follow-up context when passing prior answers back to Gemini

---

## Voice Input

The `Dropzone` supports voice input through the Web Speech API:

```tsx
<Dropzone
  onImageSelected={handleImageSelected}
  onTextPasted={handleTextPasted}
  onQuickSubmit={handleQuickTextSubmit}
  onError={handleError}
  onVoiceInput={handleQuickTextSubmit}
/>
```

Voice input:

- works in Chrome and Edge
- uses `en-US`
- should fail gracefully with a visible permission/browser message when unsupported
- should show listening/transcript feedback while active

---

## Favicon Prompt

> A minimalist brain circuit icon, geometric style, maroon (#7A1F34) and white color scheme, on transparent background, clean vector lines, suitable for small sizes (16x16 to 512x512), modern and professional, subtle academic character, centered composition
