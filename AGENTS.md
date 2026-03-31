# AGENTS.md - AnyQuestionSolver

Last updated: 2026-03-31

## Scope

- Applies to: `/Users/baney/Documents/Software/AnyQuestionSolver`
- Shared base instructions live in `/Users/baney/AGENTS.md`
- Local docs to read before non-trivial work: `GEMINI.md`, `ARCHITECTURE.md`, `README.md`, `package.json`, `.env.example`

## Project Shape

- Runtime: client-side React 19 + TypeScript + Vite SPA
- Package manager and scripts: Bun
- Styling: Tailwind CSS 4 + project CSS variables in `src/index.css`
- AI: provider-registry architecture with Gemini, OpenRouter, MiniMax, and custom OpenAI-compatible support
- Primary runtime is still browser-first, but signed-in Convex flows can provide sync, encrypted provider-key storage, and the MiniMax secure advanced image bridge when configured

## Core Product Rules

- Keep the app browser-first. API keys are client-exposed by design for guest/local usage.
- The only intentional secure backend inference exception is MiniMax advanced image understanding; do not imply generic MCP or desktop-local tool support in the browser.
- Preserve the main state flow in `src/App.tsx`: `IDLE` -> `PREVIEWING` -> `LOADING` -> `SOLVED` or `ERROR`, plus the `NEWS` and `WOTD` branches.
- `fast` and `deep` are the only solve modes the UI should expose. Grounding/research routing is automatic.
- Follow-up tutoring must stay context-aware: original question, original image, prior answer, and recent follow-up turns all matter.
- News and Word of the Day are dedicated surfaces, not generic chat variants.
- Avoid gimmicks. Prefer clear tutoring, resilient media rendering, and maintainable UI over novelty.
- Preserve the normalized provider settings shape; do not reintroduce flat per-provider preference fields.

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
  Secure provider routing and MiniMax advanced image bridge integration.
- `src/components/ChatPanel.tsx`
  Follow-up usability, keyboard interactions, local `Escape` behavior, empty/error states.
- `src/components/RichResponse.tsx`
  Markdown/media rendering, compact follow-up formatting, video/image/link blocks.
- `src/components/NewsView.tsx`
  Editorial layout, floating desk chat, desktop/mobile behavior.
- `src/services/search.ts`
  Video/image/web search reliability and free fallback paths.

## Verification Commands

Run these after code changes unless the task makes one impossible:

- `bun lint`
- `bun test src/utils/image.test.ts src/utils/input.test.ts src/utils/solution.test.ts src/utils/request.test.ts src/services/gemini.test.ts src/services/ai.test.ts src/services/providers/registry.test.ts src/services/news.test.ts src/services/wotd.test.ts`
- `bun run build`

## Browser Verification

If UI or interaction code changed, also verify in a browser:

- no console errors that indicate app breakage
- keyboard behavior still works
- no clipped or overlapping layouts on desktop and mobile
- no accidental horizontal overflow
- focus states remain visible

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
