# GEMINI.md - AnyQuestionSolver

Last updated: 2026-04-01

- Read `AGENTS.md` and `ARCHITECTURE.md` before non-trivial edits.
- Shared skill index: `/Users/baney/.agents/skills/INDEX.md`
- Use `skill-system` if routing is unclear, `research-first` before bigger builds, and `verify` before saying done.
- Foundation first: protect the runtime shape, env setup, docs, and verification path before feature growth.
- Keep `AGENTS.md`, `ARCHITECTURE.md`, and `README.md` aligned with actual commands and app structure.
- Research in this order: local docs and nearby code first, rendered app second when UI is involved, official docs via `context7` third, broader web research last.
- Apply research-grounded standards: purpose-first design, bounded-rationality assumptions, intuition as hypothesis not proof, cognitive-load control, strong grouping, and ethical behavioral guidance.
- **Codex Frontend Scope**: Codex may work on frontend behavior and presentation here, but must stay repo-first and scoped. Preserve the `100dvh` one-screen layout, pinned follow-up composer, and established Mike Answers visual language unless the user explicitly asks for a broader redesign.
- Before non-trivial UI changes, inspect the current rendered behavior, the relevant local components, and the official docs for the libraries being touched.
- **Zero-Slop UI Layout**: The layout must enforce a strict `100dvh` "One Screen For All" paradigm without any global body scrolling. All long content (answers, news, chat histories) must use internal `overflow-y-auto` blocks or strict pagination to guarantee the follow-up inputs always remain firmly pinned on screen.
