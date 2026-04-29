# Mike Answers

Mike Answers is a React + Vite app for conservative Christian tutoring, fast broad-domain answers, research, and visual explanation with bring-your-own-key, gateway, and local provider routes.
Users can start with `Gemini`, switch to `ChatGPT / OpenAI`, `Claude / Anthropic`, `Venice.ai`, `xAI`, `OpenRouter`, `Vercel AI Gateway`, a searchable `Provider catalog`, or a `Custom OpenAI-compatible` endpoint. BYOK keys stay local to the browser by default.

## Current product shape

- Mike Answers is browser-first, with Gemini as the default student route and BYOK/local/gateway routes for more control.
- The primary workspace supports direct text, screenshot paste, and voice capture.
- Mike’s tutor posture is truth-first, method-first, and conservative Christian when worldview, moral, spiritual, or theological questions are involved.
- The default student recommendation is `Gemini` because Google AI Studio documents a free Gemini API tier with free input/output tokens for getting started, plus native screenshot solving.
- Settings are provider-registry driven rather than hard-coded to one or two providers.
- OpenRouter supports a `free-only` model filter and the official `openrouter/free` router so users can stay on zero-cost models when possible.
- The provider catalog highlights ChatGPT/OpenAI, Claude/Anthropic, Venice.ai (OpenAI-compatible plus optional web-assisted answers when enabled by the API), xAI, Vercel AI Gateway, OpenRouter, other hosted APIs, gateways, and local routes such as localhost Ollama and LM Studio.
- Custom OpenAI-compatible providers can define their own base URL, key, and model slots.
- Cloudflare Workers deployment is configured with `wrangler.jsonc` and a GitHub Actions workflow.
- The app now includes a stronger PWA shell with install, offline-ready prompts, update prompts, mascot asset pipeline, and an updated Mike Answers brand surface.

## Local setup

1. Install dependencies:

```bash
bun install
```

1. Copy `.env.example` to `.env.local` and fill what you actually want to enable.

1. Start the app:

```bash
bun run dev
```

1. Open `http://localhost:3000` or the Vite fallback port shown in the terminal.

## Provider onboarding

### Gemini

1. Create a key at [Google AI Studio](https://aistudio.google.com/app/apikey).
1. Google’s pricing page documents a `Free` Gemini API tier for developers and small projects, including free input and output tokens for supported models: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).
1. Free tier is not the same as private unlimited usage. Google’s docs say free-tier content may be used to improve products; paid tier says content is not used to improve products.
1. For students, keep `Fast` on `gemini-2.5-flash-lite`, use `gemini-2.5-flash` when grounding/current context matters, and reserve `gemini-2.5-pro` or preview Pro models for harder walkthroughs.
1. Gemini is the cleanest default when the goal is one student-friendly key, native image support, audio transcription, and direct browser capability.

### ChatGPT / OpenAI

1. Create a key at [OpenAI API keys](https://platform.openai.com/api-keys).
1. Choose `ChatGPT / OpenAI` in the provider catalog.
1. Pick models from the dropdown. Use lower-cost mini/nano models for `Fast` and a stronger GPT model for `Deep`.
1. OpenAI model availability changes by account and date; if a dropdown model is not enabled for your account, choose a compatibility fallback or type the model id manually through `Custom OpenAI-compatible`.

### Claude / Anthropic

1. Create a key at [Anthropic API keys](https://docs.anthropic.com/settings/keys).
1. Choose `Claude / Anthropic` in the provider catalog.
1. Mike uses Anthropic’s official OpenAI SDK compatibility layer at `https://api.anthropic.com/v1`.
1. Anthropic says this compatibility layer is best for testing and comparison. For full Claude features such as PDF support, citations, prompt caching, and extended thinking, use Anthropic’s native API outside this browser-first OpenAI-compatible route.

### xAI

1. Create a key through the [xAI API docs](https://docs.x.ai/docs/api-reference).
1. Choose `xAI` in the provider catalog.
1. Use the model dropdown for current Grok routes such as `grok-4-1-fast-non-reasoning` and `grok-4-1-fast-reasoning`.
1. xAI’s OpenAI-style chat endpoint supports text/image chat prompts on capable models.

### Vercel AI Gateway

1. Create or copy an AI Gateway key from Vercel.
1. Choose `Vercel AI Gateway` in the provider catalog.
1. The OpenAI-compatible base URL is `https://ai-gateway.vercel.sh/v1`.
1. Vercel model ids use `creator/model-name`, such as `openai/gpt-5.4`, `anthropic/claude-sonnet-4.6`, or `xai/grok-4.1-fast-non-reasoning`.
1. Vercel exposes model discovery at `https://ai-gateway.vercel.sh/v1/models`; use the Vercel dashboard/models page for current availability and pricing.

### Venice.ai

1. Read [docs.venice.ai](https://docs.venice.ai/) and create an API key in the Venice dashboard.
1. Pick the `Venice.ai` preset. Base URL stays `https://api.venice.ai/api/v1`.
1. Venice documents optional web-assisted completions (`venice_parameters`). Mike merges defaults into each chat (`enable_web_search: auto`, `enable_web_citations: true`). Verify behavior, limits, and billing in Venice.
1. Model ids come from the Venice catalog (for example `zai-org-glm-5`, `qwen3-4b`). Drop-down entries label economy-tier picks as lower-quality shortcuts for casual checking.
1. Venice’s built-in retrieval is independent from Mike’s screenshot image search / YouTube helpers: without Google Custom Search keys, those helpers still degrade to Openverse, Wikipedia thumbnails, or Jina fallbacks rather than disappearing.

### OpenRouter

1. Create a key at [OpenRouter API keys](https://openrouter.ai/keys).
1. Keep `Free only` enabled in the app if the goal is equitable no-cost usage.
1. Leave model pickers on `Auto-pick recommended model` unless you need a specific `:free` model.
1. Auto-pick favors OpenRouter’s official `openrouter/free` router for the lowest-maintenance free path.
1. Optional secure free mode can use a shared key if `VITE_OPENROUTER_FREE_API_KEY` is configured and the user explicitly enables free mode + accepts legal notice in setup.

### Provider catalog and Ollama

1. Search the setup catalog for ChatGPT/OpenAI, Claude/Anthropic, Venice.ai, Ollama Cloud, xAI, DeepSeek, Groq, Together, Fireworks, Mistral, Perplexity, Cerebras, SambaNova, Cloudflare AI Gateway, Vercel AI Gateway, LiteLLM, LM Studio, localhost Ollama, and more.
2. Pick a preset, paste that provider's key if required, and adjust the model ids if your account uses different names. Economy-tier and small-parameter models intentionally show **quality disclaimers** in the model dropdown notes.
3. Gateway presets often require editing the base URL to include your account, gateway, or proxy path.

### Custom OpenAI-compatible

1. Enter a compatible base URL and API key
2. Set your own `fast` and `deep` model ids
3. Use this only for text and tutoring unless you have verified image capability elsewhere in your own stack

## Security model

- API keys are client-side by design.
- `Session only` is the safer default for shared or semi-shared devices.
- `Remember on this device` is available only as an explicit user choice.
- Remembered provider keys are encrypted locally at rest before storage, which protects at rest on the device but not from malicious browser extensions, compromised devices, or pasted keys.
- Gemini’s free tier is useful for students, but provider privacy/training terms still matter. Use session-only keys on shared devices and avoid sensitive data unless you understand the provider’s data policy.
- Cross-device movement is handled by encrypted transfer or live peer sync, not by a hosted account layer.

## Legal and safety

- Mike Answers is an educational tutoring app, not professional legal/medical/financial advice.
- Review provider privacy/retention/training policies before sharing sensitive data.
- See `LEGAL_SAFETY.md` for the current legal and safety guardrails checklist.

## Cloudflare Workers deployment

The repo is configured for static asset deployment on Cloudflare Workers.

Recommended production shape:

- Cloudflare Workers for hosting
- browser-local provider keys and history
- no account requirement
- no hosted sync requirement

This keeps secrets on the user's device, avoids a central account/vault layer, and fits the app's browser-first design.

Secure local-first features:

- remembered provider keys are encrypted at rest in the browser before storage
- recent solved sessions and follow-up chat snapshots stay on-device
- encrypted device transfer can move the local workspace between devices using QR frames or an encrypted backup file
- QR transfer requires a passphrase on the receiving device before anything is decrypted
- optional live peer sync can keep two open devices aligned over a direct WebRTC data channel after QR-based encrypted pairing

Live peer sync notes:

- it is peer-to-peer, not cloud relay sync
- both devices must be open during the sync session
- pairing uses encrypted offer/answer payloads that can be transferred by QR or pasted manually
- WebRTC transport is DTLS-encrypted, and the pairing payloads are additionally passphrase-encrypted before exchange
- remembered keys still stay encrypted at rest locally on each device

Local deploy commands:

```bash
bun run cf:whoami
bun run preflight:prod
bun run build
bun run deploy
```

Production preflight checks:

- verifies Cloudflare auth or API-token availability
- verifies a single Cloudflare account target is configured for non-interactive deploys
- warns when optional OpenRouter attribution is unset

Cloudflare-only local mode notes:

- API keys stay in session memory or browser storage based on the user's choice
- this is the preferred privacy/security path when sync is not required

GitHub Actions workflow:

- File: `.github/workflows/deploy-workers.yml`
- Required GitHub secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `GEMINI_API_KEY` only if you still want an env-provided Gemini fallback
  - `GOOGLE_API_KEY` if you use Google search APIs

Custom domain target:

- attach your chosen Worker route or custom domain in Cloudflare after the first successful deploy
- `mike-net.top` currently serves a legacy deployment that is not this repo's `mike-answers` Worker, so cutover requires updating the `BaneyNet` zone before attaching this repo to that domain

## Verification

```bash
bun lint
bun test src/utils/image.test.ts src/utils/input.test.ts src/utils/solution.test.ts src/utils/request.test.ts src/services/gemini.test.ts src/services/ai.test.ts src/services/aiCitation.test.ts src/services/openaiCompatible.test.ts src/services/providers/registry.test.ts src/services/news.test.ts src/services/wotd.test.ts src/services/workspaceTransfer.test.ts src/utils/followUpContext.test.ts
bun run build
```
