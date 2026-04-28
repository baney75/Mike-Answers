# Mike Answers Architecture

Last updated: 2026-04-27

## Overview

**Mike Answers** is a React + Vite SPA for conservative Christian tutoring, broad-domain answers, research, and visual explanation with bring-your-own-key, gateway, and local provider onboarding. Users can pick `Gemini`, `OpenRouter`, a searchable OpenAI-compatible provider catalog (`ChatGPT / OpenAI`, `Claude / Anthropic`, `xAI`, `Vercel AI Gateway`, and more), or `Custom OpenAI-compatible`. The preferred deployment path is browser-local on Cloudflare Workers with encrypted local storage and optional peer-to-peer sync.

---

## Core Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 6 |
| Runtime | Bun |
| Styling | Tailwind CSS 4.1 + CSS variables |
| AI | Gemini (`@google/genai`), OpenRouter, OpenAI-compatible preset catalog, gateways, local routes, or custom OpenAI-compatible transport |
| Auth | None required |
| Sync | Encrypted transfer or live peer-to-peer WebRTC |
| Deploy | Cloudflare Workers static assets + Wrangler |
| Search | Google Custom Search, YouTube, Openverse, Wikipedia |

### Research And Change Discipline

- Local code is the primary source of truth for behavior in this repo.
- Official docs are the primary source of truth for library APIs and framework behavior.
- Rendered browser behavior is the source of truth for layout, overflow, focus, and pinned-composer correctness.
- When these disagree, resolve the discrepancy before coding deeper.

### Human Factors Basis

- The app assumes bounded-rational users, not ideal ones: limited attention, limited working memory, interruptions, and uncertainty.
- Dense answer and tutoring surfaces therefore need visible hierarchy, strong grouping, and a clear next action.
- The pinned follow-up composer, local `Escape` ownership, and one-screen layout are not just aesthetic choices; they reduce context loss and interaction cost.
- Provider setup and capability messaging should prefer recognition over recall, progressive disclosure over immediate complexity, and honesty over marketing-style ambiguity.
- Moral, spiritual, theological, cultural, and worldview questions default to a conservative Christian frame while still separating Scripture, verified fact, inference, and prudential judgment.

### Key Principle: **Browser-first inference with local encrypted storage and optional peer sync**

- Guest inference can happen directly from the browser with user-provided keys, gateway keys, or reachable local OpenAI-compatible servers.
- The default production posture is Cloudflare-hosted and browser-local: provider keys stay in memory or on the user's device.
- Remembered provider keys are encrypted at rest in the browser using a non-extractable local Web Crypto key stored in IndexedDB.
- Browser BYOK keys are client-side by design. Encrypted storage protects remembered keys at rest on the device, not from malicious browser extensions or compromised devices.
- Gemini is the default student path because Google AI Studio exposes a free Gemini API tier for getting started; the app still tells users that free-tier provider terms and data-use rules matter.
- The onboarding flow defaults to `session-only` storage and offers encrypted on-device persistence explicitly.
- Cloudflare Workers hosts the built SPA from `dist/`.
- Production deploys now use an explicit repo-side preflight (`scripts/production-preflight.mjs`) before `wrangler deploy` so auth, account targeting, and obvious env mistakes fail fast.
- Local-first deployments can transfer workspace state between devices with an encrypted QR or backup-file flow; the transfer bundle includes provider settings, encrypted keys, and recent solved-session chat snapshots.
- Local-first deployments can also establish a live peer-to-peer sync session over WebRTC data channels. Pairing is done with encrypted QR or pasted signaling payloads, and the live channel only exists while both devices remain open.
- The PWA layer exposes install prompts, offline-ready notices, update prompts, and periodic service worker update checks.

---

## Directory Structure

```
src/
├── main.tsx           # React entry point
├── App.tsx            # Main app shell + state machine orchestration
├── index.css          # Global styles, CSS variables, Tailwind
├── types.ts           # Shared TypeScript types
├── components/        # UI components (including extracted workspaces)
│   └── setup/         # Provider/settings control surface
├── hooks/             # Custom React hooks
├── services/          # External API integrations (see Services)
│   └── providers/     # Provider registry + descriptors
└── utils/             # Pure utility functions
```

### App Shell And Workspaces

`App.tsx` still owns the single state machine, keyboard policy, provider orchestration, history persistence, and routed surface switching. View composition is now split into dedicated workspace components so the shell does not carry layout complexity for every screen:

- `HomeWorkspace`: composer-first home surface with one onboarding story, subject control, Daily Desk shortcut, and starter prompts
- `SolveWorkspace`: solved-study layout that composes `SolutionDisplay`, `ActionBar`, and `ChatPanel`
- `DeskWorkspaceShell`: shared bounded shell for `NewsView` and the Daily Desk

Home shell ordering now follows a fixed responsive rule:

- desktop: editorial two-column layout with the composer surface dominant and the Daily Desk / prompt rail secondary
- tablet and mobile: single-column stack where identity, onboarding, subject selection, and the visible top of the question composer appear before any secondary utilities

Heavy secondary surfaces are lazy-loaded from the app shell:

- `SolveWorkspace`
- `NewsView`
- `WordOfTheDay`
- `AiCitationModal`
- `WorkspaceTransferModal`

---

## Application State Machine

`App.tsx` manages a single state machine with these states:

| State | Trigger | Renders |
|-------|---------|---------|
| `IDLE` | Initial, after clear | `HomeWorkspace` |
| `PREVIEWING` | Input received, before submit | review shell + `InputPreview` |
| `LOADING` | User clicks fast/deep | `LoadingState` |
| `SOLVED` | AI returns answer | `SolveWorkspace` |
| `ERROR` | API failure | `ErrorState` |
| `NEWS` | User opens analyst news desk | `DeskWorkspaceShell` + `NewsView` |
| `WOTD` | User opens Daily Desk | `DeskWorkspaceShell` + `WordOfTheDay` |

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
SOLVED → WOTD (user opens the Daily Desk)
WOTD → SOLVED (user returns)
```

**Onboarding gate:**
- The app now treats provider setup as a first-class onboarding flow.
- If the selected provider is not ready, the home screen shows one compact onboarding banner directly adjacent to the composer.
- Solve actions stay visible even before setup is complete. A blocked solve attempt opens `SetupGuide`, preserves the current draft, and returns the user to that draft after setup closes.
- `SetupGuide` can still be opened deliberately from the header settings icon.

**Layout invariant:**
- The app shell is intentionally locked to a single viewport (`100dvh`) with no global body scrolling.
- Long answers, chat history, and news content must scroll inside dedicated panels or paginate.
- The follow-up composer stays pinned and immediately reachable while surrounding content scrolls.

**Daily Desk invariant:**
- Home now exposes one `Daily Desk` entry instead of separate quick buttons for word, verse, and news.
- The `WOTD` branch is a unified Daily Desk surface with internal scene navigation for `overview`, `word`, `verse`, and `news`.
- Verse of the Day stays in-app with citation and copyright notice visible on the verse scene.
- The Daily Desk news scene is a compact briefing, not the full analyst News desk.

**Follow-up Context Preservation:**
When the user asks follow-up questions after receiving a solution:
- Original question context is persisted on each history item as `originalContext`, including text and a balanced retained image when the original solve was image-based
- The solve flow keeps two image encodings for image questions: a full-quality analysis image for the current solve and a smaller persisted image for history, reloads, transfers, and retries
- Every follow-up turn rebuilds a deterministic context payload that includes the original question, the retained original image, and a compact base-solution summary from the earlier solve
- Reloaded history items and imported transfer bundles restore that same follow-up context instead of falling back to `requestText` alone
- Original solve metadata (`provider`, `model`, and `generatedAt`) remains immutable in stored history even if the user changes providers before a later follow-up
- If the tutor asks a numbered clarification question, short replies are treated as answers to that clarification instead of restarting the loop
- `ChatPanel` also seeds purpose-built starter prompts based on the current solution shape (for example video-heavy, homework-safe, or clarification-heavy answers)
- The follow-up UI is now an inline continuation of the solved answer: transcript directly under the solution, targeted prompt chips in a bottom dock, and a pinned composer that stays reachable without reopening a side rail
- `Escape` is owned locally by the follow-up workspace: it clears the draft first, then blurs the focused control, and no longer triggers the app-level solved-screen exit while the panel is active
- This ensures context continuity even in multi-turn tutoring sessions

---

## Input System

### Dropzone Component

The `Dropzone` component (`src/components/Dropzone.tsx`) is the question composer panel used inside `HomeWorkspace`:

- **Global keyboard listener**: Captures typed text anywhere on page
- **Enter**: Submits with `fast` model
- **Shift+Enter**: Inserts newline in text composer
- **Paste**: `Cmd+V`/`Ctrl+V` - images go to preview, text goes to textarea
- **Drag & drop**: Image files
- **Click**: Opens file picker
- **Voice input**: Web Speech API or MediaRecorder fallback

Important layout rule:
- `Dropzone` is now size-intrinsic. `HomeWorkspace` owns overall home-surface layout, while `Dropzone` only owns the internal question-capture UI. It must not reclaim viewport height with `flex-1`, `h-full`, or similar full-height semantics that would bury onboarding or let secondary cards rise above the composer on smaller screens.

### Onboarding and Settings

`SetupGuide` is now a step-based settings sheet backed by a provider registry:

1. choose route
2. add key, sign in, or confirm a local server route
3. personalize models and account state

Design intent:
- reduce choice overload
- keep advanced settings hidden until useful
- make the security tradeoff visible before the user stores a secret on-device
- make Gemini, BYOK, local, and gateway routes searchable instead of forcing users through a fixed card list
- keep Settings reachable after onboarding instead of trapping users in a first-run-only wizard
- keep provider capabilities explicit instead of implying unsupported browser features

Provider model slots:
- `fast`
- `deep`
- `grounded` for Gemini
- optional provider-specific slots such as transcription

Provider storage shape:
- runtime settings now use a normalized `providers: Record<ProviderId, ProviderRuntimeConfig>` map
- legacy snapshots that reference removed providers migrate to Gemini
- Convex preferences mirror that normalized provider map to avoid new schema churn for every provider addition

### Subject Selection

Users can select a subject (Auto-detect, Mathematics, Physics, Chemistry, Bible & Theology, etc.) that influences AI routing and starter prompts. Subject options live in `src/constants/subjects.ts` so the home composer and preview shell stay aligned.

### Daily Desk Surface

`src/components/WordOfTheDay.tsx` now acts as the unified Daily Desk presentation surface:

- `overview` scene: a one-screen briefing tying together the daily word, the verse, and the lead verified headline
- `word` scene: Merriam-Webster word, pronunciation, definition, and usage context
- `verse` scene: in-app Scripture presentation with source label and copyright notice
- `news` scene: compact lead-story summary plus a short headline stack from curated feeds
- right rail: scene brief plus a Daily Desk-specific Ask Mike panel

The Daily Desk intentionally stays bounded:

- its own internal scroll regions handle overflow
- it does not replace the full `NewsView` analyst desk for deeper current-events work
- its Ask Mike context is limited to the currently loaded desk content instead of pretending to browse beyond it
- the shell renders immediately and loads word, verse, and news as independent sections instead of blocking the whole surface behind one all-or-nothing loader
- word and verse can appear before the news stack is ready, and section-level fallback messages replace the old blank syncing takeover
- Daily Desk chat unlocks as soon as at least one desk section is ready, so students can keep learning even while another section is still syncing or errored
- browser CSP must allow the public Daily Desk and media-search fetch origins (`rss2json`, `codetabs`, `OurManna`, `Openverse`, `Wikipedia`, and YouTube transcript endpoints) because the app fetches those sources directly from the client

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

- routes solve/chat/transcription calls to Gemini, OpenRouter, OpenAI-compatible presets, or a custom OpenAI-compatible provider
- enforces provider readiness before solve
- keeps OpenRouter model selection inside the `fast` and `deep` UX
- blocks image solving on text-only OpenRouter models
- blocks image solving on text-only/no-image provider routes when those paths are not honestly supported

### providers/registry.ts

`src/services/providers/registry.ts` defines:

- provider ids, labels, docs links, and descriptions
- default base URLs and default model slots
- provider capability flags such as grounding, browser image input, audio transcription, key requirements, local-only routes, gateway routes, and custom base URL support
- normalized default settings for runtime and synced preferences
- searchable OpenAI-compatible presets including hosted APIs, gateways, LM Studio, and Ollama

### gemini.ts (Gemini Provider + Routing Heuristics)

`src/services/gemini.ts` still owns the existing Gemini heuristics:

**Key Methods:**
- `solveQuestion(base64Image, mode, subject, detailed)` - Image + text question
- `solveTextQuestion(text, mode, subject, detailed)` - Text-only question
- `chatWithTutor(history, message, followUpContext?)` - Follow-up questions with persisted original-question context and compact base-solution grounding
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
- tutoring/chat calls across OpenRouter, OpenAI-compatible presets, and custom providers

### OpenAI-Compatible Presets

The searchable provider catalog now highlights leading student routes before the broader list:

- `ChatGPT / OpenAI`
- `Claude / Anthropic` through Anthropic's official OpenAI compatibility layer
- `xAI`
- `Vercel AI Gateway`
- OpenRouter, DeepSeek, Groq, Together, Fireworks, Mistral, Perplexity, Cloudflare AI Gateway, LiteLLM, LM Studio, Ollama, and custom endpoints

Preset descriptors define docs links, base URLs, model dropdown options, capability flags, and privacy/retention/training summaries. Gateway presets keep provider-prefixed model ids visible, for example `openai/gpt-5.4`, `anthropic/claude-sonnet-4.6`, and `xai/grok-4.1-fast-non-reasoning`.

### convex/ai.ts (Secure Provider Actions)

`convex/ai.ts` mirrors client provider routing where signed-in flows are configured:

- secure text/chat routing for configured providers
- secure image solve routing for Gemini and OpenRouter
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

### Model Catalog System

`src/services/catalogs/` contains explicit per-provider model catalog fetchers. Each provider with a live model listing endpoint gets its own file and fetcher function:

| Fetcher | Endpoint | Provider |
|---------|----------|----------|
| `fetchOpenAICatalog` | `api.openai.com/v1/models` | OpenAI |
| `fetchDeepSeekCatalog` | `api.deepseek.com/v1/models` | DeepSeek |
| `fetchGroqCatalog` | `api.groq.com/openai/v1/models` | Groq |
| `fetchTogetherCatalog` | `api.together.xyz/v1/models` | Together AI |
| `fetchFireworksCatalog` | `api.fireworks.ai/inference/v1/models` | Fireworks AI |
| `fetchMistralCatalog` | `api.mistral.ai/v1/models` | Mistral |
| `fetchXAICatalog` | `api.x.ai/v1/models` | xAI |
| `fetchCerebrasCatalog` | `api.cerebras.ai/v1/models` | Cerebras |
| `fetchSambaNovaCatalog` | `api.sambanova.ai/v1/models` | SambaNova |
| `fetchDeepInfraCatalog` | `api.deepinfra.com/v1/openai/models` | DeepInfra |
| `fetchCohereCatalog` | `api.cohere.ai/compatibility/v1/models` | Cohere |
| `fetchHyperbolicCatalog` | `api.hyperbolic.xyz/v1/models` | Hyperbolic |
| `fetchHuggingFaceCatalog` | `router.huggingface.co/hf-inference/v1/models` | Hugging Face |
| `fetchNvidiaNimCatalog` | `integrate.api.nvidia.com/v1/models` | NVIDIA NIM |
| `fetchNovitaCatalog` | `api.novita.ai/v3/openai/models` | Novita AI |
| `fetchSiliconFlowCatalog` | `api.siliconflow.cn/v1/models` | SiliconFlow |
| `fetchVeniceCatalog` | `api.venice.ai/api/v1/models` | Venice.ai |

Each fetcher:
- Has its own function name, base URL, and cache
- Uses Bearer token auth with the user's API key
- Calls `parseModelListResponse` from `modelCatalog.ts` for parsing
- Is independently testable

The routing is handled explicitly by `useProviderCatalog` hook through a switch statement on provider/preset ID. No shared generic fetch function exists — each provider's endpoint is hardcoded.

Providers without model catalog support (Anthropic, Azure, Vertex AI, Bedrock, Perplexity, gateways, local servers) keep `supportsModelCatalog: false` and use hardcoded `modelOptions[]` dropdowns.

### Other Services

- `dictionary.ts` - Definition lookups (dictionaryapi.dev)
- `pyodide.ts` - Python code execution in browser

---

## Response Rendering

## Verification Expectations

Run these after meaningful code changes:

- `bun lint`
- `bun test src/utils/image.test.ts src/utils/input.test.ts src/utils/solution.test.ts src/utils/request.test.ts src/services/gemini.test.ts src/services/ai.test.ts src/services/aiCitation.test.ts src/services/openaiCompatible.test.ts src/services/providers/registry.test.ts src/services/news.test.ts src/services/wotd.test.ts src/services/workspaceTransfer.test.ts src/utils/followUpContext.test.ts`
- `bun run build`

Browser verification expectations:

- no relevant console errors, hydration warnings, failed requests, or missing assets introduced by the change
- no accidental horizontal overflow or fallback to global body scrolling
- settings remain usable at mobile widths
- provider switching, provider search, leading provider shortcuts, and Ollama preset selection work
- follow-up composer remains pinned while long content scrolls internally
- `Escape` ownership stays local in follow-up, `NEWS`, and `WOTD`
- no-key, BYOK, local, and gateway capability messaging stays honest

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
- mounted inside `SolveWorkspace`, with local escape ownership preserved on mobile and desktop

### SolutionDisplay Component

`src/components/SolutionDisplay.tsx` can split the answer body from the final `**Answer:**` section.

For homework-like prompts:
- the teaching portion renders first with sources intact
- the final answer is hidden behind a reveal button
- students can toggle the answer open only when they want to check their work
- the homework-safe flag is persisted with saved solutions/history so the behavior survives reloads and revisits

### Workspace Components

- `HomeWorkspace` is the first-solve surface: editorial identity block, one provider-readiness banner, the subject selector, the composer, and secondary Daily Desk/prompt utilities
- `SolveWorkspace` is the solved-study surface: one reading column for the answer and transcript, a compact pinned follow-up dock, and a responsive command grid for solve actions
- `DeskWorkspaceShell` is a thin bounded wrapper for secondary full-screen desk surfaces so they share one-screen behavior without pushing those layout concerns back into `App.tsx`

### Print / PDF Output

`src/index.css` defines a dedicated print layer so `window.print()` exports cleaner PDFs:
- hides interactive chrome via `.no-print`
- removes grid/shadow effects
- sets tighter page margins and print-safe typography
- avoids splitting major cards, charts, tables, and code blocks across pages when possible
- prints links with their URLs for shareable PDFs
- prints the same inline follow-up transcript the user sees in the solved workspace instead of relying on a hidden duplicate rail

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
