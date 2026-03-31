# Mike Answers Architecture

Last updated: 2026-03-31

## Overview

**Mike Answers** is a React + Vite SPA for broad-domain answers, tutoring, research, and visual explanation with secure bring-your-own-key onboarding. Users can pick `Gemini`, `OpenRouter`, `MiniMax`, or `Custom OpenAI-compatible`. Guests can stay browser-local, while signed-in deployments can use Clerk + Convex for synced preferences, history, encrypted provider-key storage, and an optional MiniMax-only secure image-understanding bridge.

---

## Core Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 6 |
| Runtime | Bun |
| Styling | Tailwind CSS 4.1 + CSS variables |
| AI | Gemini (`@google/genai`), OpenRouter, MiniMax, or custom OpenAI-compatible transport |
| Auth | Clerk |
| Sync | Convex |
| Deploy | Cloudflare Workers static assets + Wrangler |
| Search | Google Custom Search, YouTube, Openverse, Wikipedia |

### Key Principle: **Browser-first inference, optional secure bridge where the browser cannot honestly comply**

- Guest inference can happen directly from the browser with user-provided keys.
- Signed-in deployments can store provider keys encrypted at rest in Convex and use authenticated actions when that path is enabled.
- MiniMax advanced image understanding is the one deliberate exception to the browser-only rule because MiniMax's OpenAI-compatible browser path does not support direct image input as of March 31, 2026.
- The onboarding flow defaults to `session-only` storage for guests and recommends the encrypted account vault for signed-in synced users.
- Clerk + Convex are used for identity, preferences, history, and secure key storage when configured.
- Cloudflare Workers hosts the built SPA from `dist/`.

---

## Directory Structure

```
src/
├── main.tsx           # React entry point
├── App.tsx            # Main app shell + state machine
├── ConnectedApp.tsx   # Clerk + Convex bridge into App
├── AuthedApp.tsx      # Clerk-only bridge into App
├── ClerkAuthControls.tsx
├── index.css          # Global styles, CSS variables, Tailwind
├── types.ts           # Shared TypeScript types
├── components/        # UI components (see Component Patterns)
│   └── setup/         # Provider/settings control surface
├── hooks/             # Custom React hooks
├── services/          # External API integrations (see Services)
│   └── providers/     # Provider registry + descriptors
└── utils/             # Pure utility functions

convex/
├── auth.config.ts
├── ai.ts
├── schema.ts
├── users.ts
├── preferences.ts
├── history.ts
└── providerKeys.ts
```

---

## Application State Machine

`App.tsx` manages a single state machine with these states:

| State | Trigger | Renders |
|-------|---------|---------|
| `IDLE` | Initial, after clear | `Dropzone` |
| `PREVIEWING` | Input received, before submit | `InputPreview` + `Dropzone` |
| `LOADING` | User clicks fast/deep | `LoadingState` |
| `SOLVED` | AI returns answer | `SolutionDisplay` + `ChatPanel` |
| `ERROR` | API failure | `ErrorState` |

**Transitions:**
```
IDLE → PREVIEWING (text/image/voice input)
PREVIEWING → LOADING (user selects fast/deep)
PREVIEWING → IDLE (user clears)
LOADING → SOLVED (success)
LOADING → ERROR (failure)
SOLVED → PREVIEWING (edit/retry) or IDLE (clear)
ERROR → PREVIEWING (edit) or IDLE (clear)
SOLVED → NEWS (user requests news)
NEWS → SOLVED (user returns)
SOLVED → WOTD (user requests word of the day)
WOTD → SOLVED (user returns)
```

**Onboarding gate:**
- The app now treats provider setup as a first-class onboarding flow.
- If the selected provider is not ready, the idle screen shows a compact provider chooser and solve actions are blocked until setup is complete.
- `SetupGuide` is opened from the header settings icon, the idle setup rail, or a blocked solve attempt.

**Follow-up Context Preservation:**
When the user asks follow-up questions after receiving a solution:
- Original question text is captured and stored in `originalQuestionRef`
- Original image (if any) is captured as base64 and stored alongside
- On follow-up, both original question and image are sent to `chatWithTutor`
- System prompt instructs AI to "Always keep the original question in mind when answering follow-ups"
- If the tutor asks a numbered clarification question, short replies are treated as answers to that clarification instead of restarting the loop
- `ChatPanel` also seeds purpose-built starter prompts based on the current solution shape (for example video-heavy or homework-safe answers)
- The follow-up UI is a guided workspace: conversation rail on the left, action rail on the right, large suggestion cards, and a dedicated composer card
- `Escape` is owned locally by the follow-up workspace: it clears the draft first, then blurs the focused control, and no longer triggers the app-level solved-screen exit while the panel is active
- This ensures context continuity even in multi-turn tutoring sessions

---

## Input System

### Dropzone Component

The `Dropzone` component (`src/components/Dropzone.tsx`) is the primary input interface:

- **Global keyboard listener**: Captures typed text anywhere on page
- **Enter**: Submits with `fast` model
- **Shift+Enter**: Inserts newline in text composer
- **Paste**: `Cmd+V`/`Ctrl+V` - images go to preview, text goes to textarea
- **Drag & drop**: Image files
- **Click**: Opens file picker
- **Voice input**: Web Speech API or MediaRecorder fallback

### Onboarding and Settings

`SetupGuide` is now a step-based settings sheet backed by a provider registry:

1. choose provider
2. add key with explicit storage choice
3. personalize models and account state

Design intent:
- reduce choice overload
- keep advanced settings hidden until useful
- make the security tradeoff visible before the user stores a secret on-device
- keep Settings reachable after onboarding instead of trapping users in a first-run-only wizard
- keep provider capabilities explicit instead of implying unsupported browser features

Provider model slots:
- `fast`
- `deep`
- `grounded` for Gemini
- optional provider-specific slots such as transcription

Provider storage shape:
- runtime settings now use a normalized `providers: Record<ProviderId, ProviderRuntimeConfig>` map
- Convex preferences mirror that normalized provider map to avoid new schema churn for every provider addition

### Subject Selection

Users can select a subject (Auto-detect, Mathematics, Physics, Chemistry, etc.) that influences AI routing.

### Solve Modes

| Mode | Model | Grounding | Use Case |
|------|-------|-----------|----------|
| `fast` | Default fast model | No | Quick answers |
| `deep` | Thinking-enabled | No | Step-by-step walkthroughs |
**Automatic Grounding**: The app auto-enables grounding for prompts asking for citations, current information, evidence, or time-sensitive officeholder/current-fact questions (for example, "who is the current president"). The preview UI stays focused on `fast` and `deep`; grounded routing happens automatically when the request requires it.

**Homework-aware rendering**: obvious coursework prompts are solved in the normal flow, but `SolutionDisplay` can hide the final `**Answer:**` section by default so students see the method first and reveal the answer deliberately.

---

## Services Layer

### ai.ts (Provider Router)

`src/services/ai.ts` is now the provider switchboard:

- routes solve/chat/transcription calls to Gemini, OpenRouter, MiniMax, or a custom OpenAI-compatible provider
- enforces provider readiness before solve
- keeps OpenRouter model selection inside the `fast` and `deep` UX
- blocks image solving on text-only OpenRouter models
- blocks MiniMax and custom-provider browser image solves when those paths are not honestly supported

### providers/registry.ts

`src/services/providers/registry.ts` defines:

- provider ids, labels, docs links, and descriptions
- default base URLs and default model slots
- provider capability flags such as grounding, browser image input, audio transcription, secure advanced support, and custom base URL support
- normalized default settings for runtime and synced preferences

### gemini.ts (Gemini Provider + Routing Heuristics)

`src/services/gemini.ts` still owns the existing Gemini heuristics:

**Key Methods:**
- `solveQuestion(base64Image, mode, subject, detailed)` - Image + text question
- `solveTextQuestion(text, mode, subject, detailed)` - Text-only question
- `chatWithTutor(history, message, originalQuestion?)` - Follow-up questions with optional original question/image context
- `transcribeAudio(audioBlob)` - Voice to text

**Model Fallback System**: If one model fails (rate limit, quota), it automatically tries the next available model.

**Grounding Logic**: `buildRequestPlan()` determines whether to enable Google Search grounding based on query intent, including explicit source requests, news/current-events, and current officeholder/leadership questions.

### openrouter.ts (OpenRouter Provider)

`src/services/openrouter.ts` adds:

- public model catalog loading from `https://openrouter.ai/api/v1/models`
- free-model filtering and recommended model selection
- OpenAI-compatible `chat/completions` calls
- text/image solve support where the chosen model allows image input

### openaiCompatible.ts (Shared OpenAI-compatible Transport)

`src/services/openaiCompatible.ts` centralizes:

- shared `chat/completions` request building
- text solve calls for OpenAI-compatible providers
- image solve calls for browser-supported OpenAI-compatible providers
- tutoring/chat calls across OpenRouter, MiniMax, and custom providers

### minimax.ts (MiniMax Preset)

`src/services/minimax.ts` owns:

- MiniMax defaults (`https://api.minimax.io/v1`, `MiniMax-M2.7-highspeed`, `MiniMax-M2.7`)
- honest browser limitation messaging
- the env contract for the secure advanced bridge

### convex/ai.ts (Secure Provider Actions)

`convex/ai.ts` mirrors the client provider routing for signed-in flows:

- secure text/chat routing for Gemini, OpenRouter, MiniMax, and custom OpenAI-compatible providers
- secure image solve routing for Gemini and OpenRouter
- MiniMax advanced image routing through `MINIMAX_ADVANCED_BRIDGE_URL`
- encrypted provider-key lookup before provider calls

### search.ts (Web/Image/Video)

- `searchWeb(query, numResults)` - Google Custom Search API
- `searchImages(query, numResults)` - Google Image Search
- `searchVideos(query, maxResults)` - YouTube Data API with a free Jina-proxied YouTube search fallback when the direct API path is unavailable
- `fetchYouTubeTranscriptPreview(videoId)` - best-effort free caption fetcher for public tracks, with graceful fallback when browser/CORS or the video itself blocks captions

**Fallbacks**: If Google APIs are unavailable, falls back to Openverse (images) and Wikipedia (images).

### wotd.ts (Word of the Day)

The `getWordOfTheDay()` function in `src/services/wotd.ts` sources the daily word from Merriam-Webster's official RSS feed, preferring a fast rss2json mirror first and falling back to feed/proxy parsing when needed.

**Features:**
- Daily word with concise definition, phonetic, and part of speech
- Example sentences when available
- 1-hour caching
- Source link to Merriam-Webster
- Minimal default UI: definition first, optional agent follow-up panel on demand

### news.ts (News Aggregation)

The `fetchAllNews()` and `fetchNewsForQuery()` functions in `src/services/news.ts` aggregate news from multiple trusted RSS sources and enrich each article for direct-source use.

**Sources:**
- Straight Arrow News (Center - original reporting)
- Tangle (Center - curated summaries)
- WSJ Tech/World/US (Center-Right - quality journalism)
- NewsNation (Center - original reporting)

**Features:**
- Parallel fetching from all sources
- Direct/proxied RSS parsing with rss2json fallback for blocked feeds
- Automatic deduplication
- Date-based sorting
- Query filtering for topic-specific news
- Per-article body-text enrichment for agent context
- Best-effort primary-source detection from article links and metadata
- Explicit `directArticleUrl` and optional `primarySourceUrl` fields for UI and citation use

### NewsView Editorial Desk

The `NewsView` component (`src/components/NewsView.tsx`) is a news-only editorial surface:

**Layout:**
- lead story panel
- latest-desk side rail
- additional coverage grid that auto-fits card columns instead of leaving fixed dead space on wide canvases
- source toggles for the approved outlets only

**Per-Article Controls:**
- direct article button
- primary-source button when detected
- ask-about-this-story button

**News Chat Context:**
- uses hydrated article body text, direct article URLs, and detected primary sources
- stays inside news mode instead of re-triggering generic search/news actions

### rss.ts (RSS Parser)

Lightweight RSS/Atom parsing + remote fetch fallback layer for browser-safe feed ingestion.

### Other Services

- `dictionary.ts` - Definition lookups (dictionaryapi.dev)
- `pyodide.ts` - Python code execution in browser

---

## Response Rendering

## Verification Expectations

Run these after meaningful code changes:

- `bun lint`
- `bun test src/utils/image.test.ts src/utils/input.test.ts src/utils/solution.test.ts src/utils/request.test.ts src/services/gemini.test.ts src/services/ai.test.ts src/services/providers/registry.test.ts src/services/news.test.ts src/services/wotd.test.ts`
- `bun run build`

Browser verification expectations:

- no console errors that indicate app breakage
- no accidental horizontal overflow on desktop or mobile
- settings remain usable at mobile widths
- provider switching works
- MiniMax limitation messaging stays honest

### RichResponse Component

`src/components/RichResponse.tsx` renders AI responses with:

| Feature | Library/Method |
|---------|---------------|
| Markdown | react-markdown + remark-gfm |
| Math (LaTeX) | remark-math + rehype-katex |
| Code blocks | Syntax highlighting |
| Charts | recharts (JSON chart blocks with line/bar/area/scatter support) |
| Chemical structures | smiles-drawer (dark mode support, error fallback with copy/retry) |
| Image search results | Inline rendering with `ImageRenderer` |
| Video embeds | `VideoEmbed` (YouTube) plus a companion brief card with fit summary, channel/date metadata, and transcript-or-notes fallback |
| Definitions | `DictionaryResult` cards |
| Source citations | Custom source-card UI (not raw markdown) |

In compact mode, `RichResponse` uses a denser but still readability-first prose style for follow-up chat:
- larger line height than a normal chat bubble
- preserved list spacing for numbered steps
- visible blockquote/callout styling
- the same media-marker resolution pipeline as the main answer

### ChatPanel Component

`src/components/ChatPanel.tsx` is a purpose-built tutoring surface rather than a generic messenger:

- conversation history in a dedicated reading pane with themed scroll chrome
- side action rail with a primary composer card, explicit `Esc` behavior, and stronger empty/error states
- large reply cards pulled from tutor clarification choices when available
- otherwise seeded with solution-aware starter prompts (for example next-step, study guide, video recap, or video-comparison prompts)
- retry/edit controls for the last user turn

### SolutionDisplay Component

`src/components/SolutionDisplay.tsx` can split the answer body from the final `**Answer:**` section.

For homework-like prompts:
- the teaching portion renders first with sources intact
- the final answer is hidden behind a reveal button
- students can toggle the answer open only when they want to check their work
- the homework-safe flag is persisted with saved solutions/history so the behavior survives reloads and revisits

### Print / PDF Output

`src/index.css` defines a dedicated print layer so `window.print()` exports cleaner PDFs:
- hides interactive chrome via `.no-print`
- removes grid/shadow effects
- sets tighter page margins and print-safe typography
- avoids splitting major cards, charts, tables, and code blocks across pages when possible
- prints links with their URLs for shareable PDFs

### Media Markers

Gemini responses may contain markers that get resolved client-side:
```
[IMAGE_SEARCH: "descriptive query"]
[VIDEO_SEARCH: "descriptive query"]
[WEB_SEARCH: "descriptive query"]
```

These resolve to actual content or fall back to external search links.

---

## Component Patterns

### Naming Conventions
- PascalCase for component files: `SolutionDisplay.tsx`
- camelCase for hooks: `useHistory.ts`
- kebab-case for utilities: `input.ts`

### Import Order
1. React
2. External libraries
3. Internal modules
4. Types

### Common Patterns

**State Updates (Functional)**:
```typescript
setState(prev => ...newValue)
```

**Component Props**: Define in `types.ts` for shared interfaces.

**Accessibility**:
- All buttons have `type="button"`
- Labels use `htmlFor` or wrapping
- Keyboard-accessible interactive elements
- No `aria-hidden` on focusable elements

---

## Styling System

### CSS Variables (index.css)

```css
--aqs-accent: #7a1f34           /* Maroon primary */
--aqs-accent-strong: #5d1526     /* Darker maroon */
--aqs-accent-soft: #f7ecf0       /* Light maroon bg */
--aqs-gold: #b88c3a             /* Gold accent */
```

### Design Tokens

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Neo-shadow | `4px 4px 0px 0px rgba(17,24,39,1)` | `4px 4px 0px 0px white` |
| Border | `border-2 border-gray-900` | `border-2 border-gray-100` |
| Container radius | `rounded-[2.2rem]` | same |

### Typography
- Sans: Space Grotesk
- Mono: JetBrains Mono

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | For Clerk | Clerk frontend auth |
| `VITE_CONVEX_URL` | For Convex | Convex deployment URL, no trailing slash |
| `CLERK_JWT_ISSUER_DOMAIN` | For Convex + Clerk | Clerk issuer for Convex auth |
| `USER_KEY_ENCRYPTION_SECRET` | For secure vault | Server-side encryption secret for stored provider keys |
| `GEMINI_API_KEY` | Optional | Client fallback Gemini key |
| `GOOGLE_API_KEY` | No | Google search features |
| `GEMINI_FAST_MODEL` | No | Override default fast model |
| `GEMINI_GROUNDED_MODEL` | No | Override grounded model |
| `GEMINI_PRO_MODEL` | No | Override pro model |

Vite exposes these via `import.meta.env` because `vite.config.ts` uses `envPrefix: ['VITE_', 'GEMINI_', 'GOOGLE_']`.

---

## Commands

```bash
bun install  # Install dependencies
bun dev      # Dev server on port 3000 (0.0.0.0)
bun run build # Production build to dist/
bun lint     # TypeScript check (tsc --noEmit)
bun test src/utils/image.test.ts src/utils/input.test.ts src/utils/solution.test.ts src/services/gemini.test.ts src/services/news.test.ts src/services/wotd.test.ts
```

---

## Important Notes

1. **.env.local is required** at runtime and is NOT hot-reloaded. Restart `bun dev` after changes.

2. **Security split**: Guest BYOK can still be browser-local. Signed-in secure vault mode stores provider keys encrypted at rest in Convex and executes inference through backend actions.

3. **Rate limits**: Free tiers hit limits quickly. If `deep` fails, retry with `fast`.

4. **Auto-upgrading**: The app auto-upgrades to grounded or Pro-tier model routing for source-sensitive or complex prompts.

5. **Image fallbacks**: Image rendering has public fallbacks (Openverse, Wikimedia) so image cards still work without `GOOGLE_API_KEY`.

6. **KaTeX bundled**: KaTeX styles come through npm imports. Do NOT add redundant CDN stylesheets in `index.html`.

7. **Web Speech API**: Browser-dependent. Test on Chrome/Edge over `localhost` or HTTPS.

---

## Adding New Features

When adding new features:

1. **Components**: Add to `src/components/` following existing patterns
2. **Services**: Add to `src/services/` for external API calls
3. **Utils**: Add pure functions to `src/utils/`
4. **Types**: Define shared interfaces in `types.ts`
5. **Tests**: Add unit tests alongside source files (`*.test.ts`)
6. **Styling**: Use existing CSS variables and Tailwind classes

### Service Integration Pattern

```typescript
// src/services/newService.ts
export async function newService(param: string): Promise<Result> {
  const response = await fetch(...);
  if (!response.ok) throw new Error(...);
  return response.json();
}
```

### Component Pattern

```typescript
// src/components/NewComponent.tsx
import { useState, useCallback } from 'react';
import type { SomeType } from '@/types';

interface Props {
  value: SomeType;
  onChange: (value: SomeType) => void;
}

export function NewComponent({ value, onChange }: Props) {
  const [local, setLocal] = useState(value);
  
  const handleChange = useCallback((next: SomeType) => {
    setLocal(next);
    onChange(next);
  }, [onChange]);
  
  return <div>...</div>;
}
```
