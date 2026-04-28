# AGENTS.md - AnyQuestionSolver

Last updated: 2026-04-28

## Scope

- Applies to: `/Users/baney/Documents/Software/AnyQuestionSolver`
- Shared base instructions live in `/Users/baney/AGENTS.md`
- Local docs to read before non-trivial work: `GEMINI.md`, `ARCHITECTURE.md`, `README.md`, `package.json`, `.env.example`

## Project Shape

- Runtime: client-side React 19 + TypeScript + Vite SPA
- Package manager and scripts: Bun
- Styling: Tailwind CSS 4 + project CSS variables in `src/index.css`
- AI: provider-registry architecture with Gemini, OpenRouter, searchable OpenAI-compatible presets, gateways, Ollama/local routes, and custom OpenAI-compatible support
- Primary runtime is browser-first. Gemini is the default student route; BYOK keys remain client-side by design.

## Research Order For This Repo

- Start with local truth, not generic React instincts: read `ARCHITECTURE.md`, inspect the nearby component/service/hook files, and trace the current state/data flow before editing.
- For UI work, inspect the rendered app first when feasible. Mike Answers is sensitive to viewport locking, pinned input placement, and `Escape` ownership, so code-only reasoning is not enough.
- For library behavior, use official docs before memory: `context7` for React, Tailwind, Vite, Clerk, Convex, and Playwright.
- Use broader web research only after local code and official docs. Prefer current, primary sources over blog-post pattern matching.
- Search for an existing local pattern before adding a new abstraction, hook, CSS token, or dependency.
- For provider or solve-flow changes, trace the full path before patching: `App.tsx` state machine -> relevant component -> provider router/service -> persistence or Convex layer when applicable.

## Research-Grounded Standards For Mike Answers

- Treat design here as tutoring and decision support, not decoration. Every layout choice should help the user understand, decide, or continue the task with less friction.
- Treat intuition as a starting point only. If a UI change feels right but you have not traced the state flow and inspected the rendered behavior, it is not grounded enough for this repo.
- Design for bounded rationality: provider setup, answer surfaces, and follow-up flows must reduce recall burden, minimize choice overload, and keep the next action obvious.
- Protect working memory aggressively. Chunk dense answers, group related controls, and avoid making the user remember hidden context that the UI could show directly.
- Respect perceptual grouping. Answer content, sources, media, and follow-up actions should read as clearly separated regions, not one noisy field.
- Preserve user control and trust. Keep statuses honest, recovery paths obvious, and risky actions deliberate. Do not add fake urgency, manipulative prompts, or misleading capability claims.

### Research Basis

- Simon and bounded rationality for purpose-first design.
- Kahneman and Klein on when intuition is trustworthy.
- Sweller and Cowan on cognitive load and working-memory limits.
- Fitts and Hick on target size and decision complexity.
- Treisman, Gelade, and Wagemans et al. on attention and perceptual grouping.

## Core Product Rules

- Keep the app browser-first. API keys are client-exposed by design for guest/local usage.
- Do not imply generic MCP, desktop-local tool support, or hidden server-side provider magic in the browser.
- Preserve the main state flow in `src/App.tsx`: `IDLE` -> `PREVIEWING` -> `LOADING` -> `SOLVED` or `ERROR`, plus the `NEWS` and `WOTD` branches.
- `fast` and `deep` are the only solve modes the UI should expose. Grounding/research routing is automatic.
- Follow-up tutoring must stay context-aware: original question, original image, prior answer, and recent follow-up turns all matter.
- News and the Daily Desk are dedicated surfaces, not generic chat variants. The Daily Desk includes both Daily Word and Verse of the Day in-app.
- Home quick access should keep a single `Daily Desk` entry for the daily briefing instead of splitting word, verse, and news into separate shortcut buttons.
- Avoid gimmicks. Prefer clear tutoring, resilient media rendering, and maintainable UI over novelty.
- Preserve the normalized provider settings shape; do not reintroduce flat per-provider preference fields.
- Keep Mike explicit in prompts by name. Initial and follow-up prompts must include current local user date/time, timezone, active model, and other directly relevant runtime context.
- No fluff on core surfaces. Home, solved, news, and daily surfaces should privilege the next action over marketing or explainer chrome.

## Dumb Mistakes To Avoid

- Do not reintroduce global body scrolling.
- Do not let long content push the follow-up composer off-screen.
- Do not make provider capabilities sound broader than they are, especially for Gemini free tier, local Ollama/LM Studio, gateway, image, or audio support.
- Do not add generic card-grid SaaS styling that fights the existing Mike Answers visual language.
- Do not duplicate state that already exists elsewhere in the app flow; prefer deriving data over syncing parallel flags.
- Do not add a new library when the repo already has a workable pattern with the current stack.
- Do not make dense tutoring screens harder to scan by collapsing hierarchy, mixing unrelated controls, or hiding the next action.
- Do not send Verse of the Day off-site when the request is for the in-app daily surface.
- Do not let `Escape` stall in solved/follow-up/news/daily flows. If the user is done, `Escape` should get them back home reliably.

## UI/UX Constraints \& Layout Rules

- **ONE SCREEN FOR ALL**: The application must remain strictly locked to a single viewport (`100dvh`). There should be *zero* global body scrolling.
  - Features that generate large amounts of vertical content (like News feeds or long Chat histories) must be either explicitly paginated (using "next/previous" arrows) or contained within their own internal `overflow-y-auto` blocks. 
  - The follow-up chat input must *never* be pushed off-screen. It should remain pinned and immediately accessible while the message history scrolls above it.
- **Codex Frontend Scope**: Codex is allowed to improve frontend behavior and presentation in this repo, but it must stay repo-first and evidence-first. No sweeping redesign of the app shell, single-screen layout, or brand language unless the user explicitly asks for that level of change.
  - Before non-trivial UI work, inspect the current rendered behavior, the relevant local components, and the official docs for any library you will touch.
  - Reuse existing tokens, spacing patterns, and component primitives before inventing new ones.
  - Preserve the maroon brand surface, strong outlines, readable dense layouts, and the pinned-composer workflow unless the task explicitly changes them.
- **Theme Flashing**: Avoid unstyled flashes. `index.html` inline scripts must proactively resolve the system or user theme (`localStorage['aqs_theme']`) before the React tree mounts to prevent the layout from briefly flashing light mode when dark mode is intended.

## High-Risk Files

- `src/App.tsx`
  Main state machine, keyboard behavior, follow-up orchestration, view switching.
- `src/services/gemini.ts`
  Model routing, grounding, follow-up context packing, media marker generation.
- `src/services/ai.ts`
  Provider routing, readiness validation, and image/audio capability enforcement.
- `src/hooks/useAISettings.ts`
  Normalized provider settings, local secret storage, and remote preference reconciliation.
- `convex/ai.ts`
  Secure provider routing for signed-in flows when configured.
- `src/components/ChatPanel.tsx`
  Follow-up usability, keyboard interactions, local `Escape` behavior, empty/error states.
- `src/components/RichResponse.tsx`
  Markdown/media rendering, compact follow-up formatting, video/image/link blocks.
- `src/components/NewsView.tsx`
  Editorial layout, floating desk chat, desktop/mobile behavior.
- `src/services/search.ts`
  Video/image/web search reliability and free fallback paths.
- `src/services/modelCatalog.ts` + `src/services/catalogs/`
  Per-provider live model catalog fetchers. Each provider with a working GET /v1/models endpoint gets its own explicit fetcher file and routing case in `useProviderCatalog.ts`. Do NOT add a shared generic fetcher — each provider must be explicit.
- `src/hooks/useProviderCatalog.ts`
  Routes to the correct per-provider catalog fetcher via explicit switch statement. Handles OpenRouter, OpenAI, Ollama Cloud, DeepSeek, Groq, Together, Fireworks, Mistral, xAI, Cerebras, SambaNova, DeepInfra, Cohere, Hyperbolic, HuggingFace, NVIDIA NIM, Novita, SiliconFlow, Venice.

## Verification Commands

Run these after code changes unless the task makes one impossible:

- `bun lint`
- `bun test src/utils/image.test.ts src/utils/input.test.ts src/utils/solution.test.ts src/utils/request.test.ts src/services/gemini.test.ts src/services/ai.test.ts src/services/openaiCompatible.test.ts src/services/providers/registry.test.ts src/services/news.test.ts src/services/wotd.test.ts`
- `bun run build`

## Browser Verification

If UI or interaction code changed, also verify in a browser:

- no relevant console errors, hydration warnings, failed requests, or missing assets introduced by the change
- keyboard behavior still works, including local `Escape` ownership and follow-up send flow
- no clipped or overlapping layouts at mobile, tablet, and desktop widths
- no accidental horizontal overflow and no regression to global body scrolling
- the pinned follow-up input remains visible while long content scrolls inside its own panel
- focus states remain visible, and loading/empty/error states still read clearly
- dark theme boot still avoids flashing the wrong theme

Pay special attention to:

- follow-up send behavior and clarification loops
- `Escape` ownership in `SOLVED`, `NEWS`, and `WOTD`
- video, image, and source-card fallback states
- the floating News desk chat only opening on explicit user action

## Docs Discipline

- Update `ARCHITECTURE.md` whenever runtime shape, state flow, major component behavior, service boundaries, or verification expectations change.
- Keep this local `AGENTS.md` short and operational. It should explain how this repo differs from the shared baseline, not duplicate the whole shared file.

## Working Style for This Repo

- Prefer focused patches over sprawling rewrites, unless a UI slice has already failed multiple repair cycles.
- When a UI slice becomes incoherent, rebuild that slice cleanly instead of stacking more conditional fixes.
- Use `apply_patch` for manual edits.
- Preserve the project’s visual language: maroon accent, strong outlines, deliberate spacing, and readable dense layouts.
- When fixing reliability issues, solve the underlying state/data flow problem first, then the presentation.
