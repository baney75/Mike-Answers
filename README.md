# Mike Answers

Mike Answers is a React + Vite app for fast, broad-domain answers, tutoring, research, and visual explanation with a bring-your-own-key model.
Users can choose `Gemini`, `OpenRouter`, `MiniMax`, or a `Custom OpenAI-compatible` endpoint, can keep their API key local to the browser, and can sign in with `Clerk` plus `Convex` to sync preferences, history, encrypted provider-key storage, and the optional secure MiniMax advanced-image path where configured.

## Current product shape

- Mike Answers is browser-first and BYOK-first.
- The primary workspace supports direct text, screenshot paste, and voice capture.
- Settings are provider-registry driven rather than hard-coded to one or two providers.
- OpenRouter supports a `free-only` model filter so users can stay on zero-cost models when possible.
- MiniMax is available for browser-safe text/chat and can optionally use a signed-in secure backend bridge for advanced image understanding.
- Custom OpenAI-compatible providers can define their own base URL, key, and model slots.
- Clerk + Convex are the account and sync foundation when enabled.
- Cloudflare Workers deployment is configured with `wrangler.jsonc` and a GitHub Actions workflow.
- The app now includes a PWA manifest, installable shell, mascot asset pipeline, and an updated Mike Answers brand surface.

## Local setup

1. Install dependencies:

```bash
bun install
```

2. Copy `.env.example` to `.env.local` and fill what you actually want to enable.

3. Start the app:

```bash
bun run dev
```

4. Open `http://localhost:3000` or the Vite fallback port shown in the terminal.

## Provider onboarding

### OpenRouter

1. Create a key at https://openrouter.ai/keys
2. Keep `Free only` enabled in the app if the goal is equitable no-cost usage
3. Leave model pickers on `Auto-pick recommended model` unless you need a specific free model

### Gemini

1. Create a key at https://aistudio.google.com/app/apikey
2. Check Google’s pricing page before heavier use: https://ai.google.dev/gemini-api/docs/pricing
3. Prefer `Flash` / `Flash-Lite` for ordinary tutoring if the goal is to stay on the free path

### MiniMax

1. Create a key at https://platform.minimax.io/docs/api-reference/text-openai-api
2. Browser mode supports text solve and tutoring only
3. As of March 31, 2026, direct browser image and audio inputs are not supported through MiniMax's OpenAI-compatible path
4. Signed-in deployments can enable `Secure advanced image understanding` to route image analysis through a backend bridge instead of pretending browser-native support exists

### Custom OpenAI-compatible

1. Enter a compatible base URL and API key
2. Set your own `fast` and `deep` model ids
3. Use this only for text and tutoring unless you have verified image capability elsewhere in your own stack

## Security model

- API keys are client-side by design.
- `Session only` is the safer default for shared or semi-shared devices.
- `Remember on this device` is available only as an explicit user choice.
- Signed-in deployments can also store provider keys in a Convex-backed encrypted vault path.
- Convex sync currently covers preferences, history, and encrypted provider-key storage where enabled.
- The only secure backend solve path intentionally exposed in this repo is MiniMax advanced image understanding, because MiniMax browser mode cannot honestly provide that capability today.

## Auth + sync setup

Optional, but recommended for personal workspaces.

Required env vars:

```bash
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
VITE_CONVEX_URL="https://your-project.convex.cloud"
CLERK_JWT_ISSUER_DOMAIN="https://your-clerk-domain.clerk.accounts.dev"
```

Useful commands:

```bash
bun run convex:dev
bun run convex:deploy
```

## Cloudflare Workers deployment

The repo is configured for static asset deployment on Cloudflare Workers.

Local deploy commands:

```bash
bun run cf:whoami
bun run build
bun run deploy
```

Convex secure-vault deployment notes:

- run `bun run convex:deploy` after signing into Convex
- set `CLERK_JWT_ISSUER_DOMAIN` in Convex
- set `USER_KEY_ENCRYPTION_SECRET` in Convex
- set `MINIMAX_ADVANCED_BRIDGE_URL` in Convex if you want MiniMax advanced image understanding
- optionally set `MINIMAX_ADVANCED_BRIDGE_TOKEN` in Convex if the bridge expects bearer auth
- use a Convex URL without a trailing slash
- the secure key vault, synced history, and MiniMax secure advanced bridge will not work until those Convex functions are deployed

GitHub Actions workflow:

- File: `.github/workflows/deploy-workers.yml`
- Required GitHub secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `VITE_CLERK_PUBLISHABLE_KEY` if using Clerk
- `VITE_CONVEX_URL` if using Convex
- `CLERK_JWT_ISSUER_DOMAIN` in Convex, not GitHub
- `USER_KEY_ENCRYPTION_SECRET` in Convex, not GitHub
  - `GEMINI_API_KEY` only if you still want an env-provided Gemini fallback
  - `GOOGLE_API_KEY` if you use Google search APIs

Custom domain target:

- planned domain: `mike-net.top`
- attach the Worker route or custom domain in Cloudflare after the first successful deploy

## Verification

```bash
bun lint
bun test src/utils/image.test.ts src/utils/input.test.ts src/utils/solution.test.ts src/utils/request.test.ts src/services/gemini.test.ts src/services/ai.test.ts src/services/providers/registry.test.ts src/services/news.test.ts src/services/wotd.test.ts
bun run build
```
