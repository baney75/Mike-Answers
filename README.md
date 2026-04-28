# Mike Answers

Mike Answers is a React + Vite app for conservative Christian tutoring, fast broad-domain answers, research, and visual explanation with no-key, bring-your-own-key, and local provider routes.
Users can choose `Puter`, `Gemini`, `OpenRouter`, a searchable `Provider catalog`, or a `Custom OpenAI-compatible` endpoint, and BYOK keys stay local to the browser by default.

## Current product shape

- Mike Answers is browser-first, with Puter as the easiest no-key route and BYOK/local routes for more control.
- The primary workspace supports direct text, screenshot paste, and voice capture.
- Mike’s tutor posture is truth-first, method-first, and conservative Christian when worldview, moral, spiritual, or theological questions are involved.
- The default student recommendation is `Puter` for no-key setup, with `Gemini` recommended when native screenshot solving matters.
- Settings are provider-registry driven rather than hard-coded to one or two providers.
- OpenRouter supports a `free-only` model filter and the official `openrouter/free` router so users can stay on zero-cost models when possible.
- The provider catalog includes OpenAI-compatible hosted APIs, gateways, and local routes such as Ollama and LM Studio.
- Custom OpenAI-compatible providers can define their own base URL, key, and model slots.
- Cloudflare Workers deployment is configured with `wrangler.jsonc` and a GitHub Actions workflow.
- The app now includes a stronger PWA shell with install, offline-ready prompts, update prompts, mascot asset pipeline, and an updated Mike Answers brand surface.

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

### Puter

1. Pick `Puter` for the easiest no-key path.
2. No Mike Answers API key is required; Puter asks the user to sign in when AI is used.
3. Puter follows a user-pays model: auth, billing, provider access, and provider policy are controlled by the user's Puter account.
4. Text solve and follow-up tutoring are enabled first, using Puter-supported defaults such as `gpt-5-nano` for Fast and `gpt-5.4` for Deep. Use Gemini or an image-capable BYOK route for screenshot solving.

### OpenRouter

1. Create a key at https://openrouter.ai/keys
2. Keep `Free only` enabled in the app if the goal is equitable no-cost usage
3. Leave model pickers on `Auto-pick recommended model` unless you need a specific `:free` model
4. Auto-pick now favors OpenRouter's official free router for the lowest-maintenance free path
5. Optional secure free mode can use a shared key if `VITE_OPENROUTER_FREE_API_KEY` is configured and the user explicitly enables free mode + accepts legal notice in setup

### Gemini

1. Create a key at https://aistudio.google.com/app/apikey
2. Check Google’s pricing page before heavier use: https://ai.google.dev/gemini-api/docs/pricing
3. For students, start with `Flash-Lite` for fast answers and keep `Flash` or `Pro` for the harder follow-ups that really need them
4. Gemini is the cleanest default if the goal is one free key, native image support, and honest browser-first capability

### Provider catalog and Ollama

1. Search the setup catalog for OpenAI, DeepSeek, Groq, Together, Fireworks, Mistral, xAI, Perplexity, Cerebras, SambaNova, Cloudflare AI Gateway, Vercel AI Gateway, LiteLLM, LM Studio, Ollama, and more.
2. Pick a preset, paste that provider's key if required, and adjust the model ids if your account uses different names.
3. Ollama uses `http://localhost:11434/v1` and does not require a key, but Ollama must already be running and reachable from the browser. CORS, localhost, and device network settings can still block it.
4. Gateway presets often require editing the base URL to include your account, gateway, or proxy path.

### Custom OpenAI-compatible

1. Enter a compatible base URL and API key
2. Set your own `fast` and `deep` model ids
3. Use this only for text and tutoring unless you have verified image capability elsewhere in your own stack

## Security model

- API keys are client-side by design.
- `Session only` is the safer default for shared or semi-shared devices.
- `Remember on this device` is available only as an explicit user choice.
- Remembered provider keys are encrypted locally at rest before storage, which protects at rest on the device but not from malicious browser extensions, compromised devices, or pasted keys.
- Puter avoids Mike Answers managing provider keys, but it introduces Puter account/auth/provider-policy dependency.
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
