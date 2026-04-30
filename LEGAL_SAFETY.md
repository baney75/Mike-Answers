# Mike Answers Legal and Safety Guardrails

Last updated: 2026-04-30

## Product posture

- Mike Answers is an educational tutoring assistant.
- It is not a law firm, medical practice, financial advisor, or licensed counseling provider.
- Users remain responsible for final decisions, submissions, and compliance obligations.

## Core disclosures

- Provider requests may be processed by third-party model vendors selected by the user.
- Data handling, retention, and training policies vary by provider.
- The app shows provider-specific privacy and retention summaries before key entry in the setup guide.
- Free-mode quality and availability may vary and can be rate-limited.

## Required UI notices

- On onboarding:
  - Shows "Quick free start" versus "Best quality (BYOK)" decision.
  - Shows plain-language privacy and retention summaries for the selected provider.
  - Shows inline legal notice with full terms before key submission/acceptance.
- In settings:
  - Shows capability truth table (text, image, audio, grounding).
  - Shows trust tier and provider policy caveats.
- In solve/chat:
  - Preserves educational framing and avoids presenting output as professional advice.

## Security baseline

- Never log raw user API keys.
- Local remembered keys are encrypted at rest using AES-GCM with a non-extractable Web Crypto key in IndexedDB.
- Session-only keys stay in memory (sessionStorage) and are cleared on tab close.
- Content Security Policy enforced at the HTML level with form-action, base-uri, and frame-ancestors restrictions.
- For secure free mode, requests route through server-side controls with:
  - per-window rate limiting (12 requests per 60-second window)
  - request size limits and model allowlist via OpenRouter free router
  - explicit legal acceptance required before free mode activation
  - strict origin checks via OpenRouter HTTP-Referer header
- Source maps disabled in production builds.
- Cloudflare Workers deployment adds security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, Strict-Transport-Security.

## Conservative Christian tutoring posture

- For worldview, moral, spiritual, and theological topics:
  - presents Scripture and doctrine clearly
  - distinguishes fact, inference, and prudential judgment
  - avoids manipulative claims and false certainty

## Compliance status

### Completed
- [x] Provider-specific privacy summaries in setup catalog
- [x] Plain-language retention and training summaries
- [x] Inline legal notice with full terms before acceptance
- [x] Legal acceptance timestamp tracked in user preferences
- [x] Educational framing preserved across all answer surfaces
- [x] Session-only vs. remember-key choice on every provider
- [x] Encrypted at-rest key storage using AES-GCM + Web Crypto + IndexedDB
- [x] Content Security Policy with modern directives (form-action, base-uri, frame-ancestors)
- [x] Security headers on Cloudflare deployment (HSTS, XFO, XCTO, Referrer-Policy, Permissions-Policy)
- [x] Source maps disabled in production
- [x] Dependency vulnerability scanning and regular updates
- [x] Hardcoded secrets removed (search engine ID externalized to env var)

### Pending
- [ ] Publish dedicated Terms of Use page (currently covered by inline legal notice)
- [ ] Publish dedicated Privacy Policy page (currently covered by provider-specific summaries + inline notice)
- [ ] Add region-specific readiness when needed (GDPR/UK GDPR and institutional requirements)
- [ ] Add CCPA compliance notice for California users
- [ ] Register DMCA agent for US-based content claims

## External references

- Full legal notice text shown inline in the Setup Guide (free mode section)
- Provider privacy details shown in CapabilityPanel and CredentialSection
- License: All Rights Reserved with personal/educational use grant (see LICENSE)
