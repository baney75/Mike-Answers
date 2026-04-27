# Mike Answers Legal and Safety Guardrails

Last updated: 2026-04-26

## Product posture

- Mike Answers is an educational tutoring assistant.
- It is not a law firm, medical practice, financial advisor, or licensed counseling provider.
- Users remain responsible for final decisions, submissions, and compliance obligations.

## Core disclosures

- Provider requests may be processed by third-party model vendors selected by the user.
- Data handling, retention, and training policies vary by provider.
- The app should show provider-specific privacy and retention summaries before key entry.
- Free-mode quality and availability may vary and can be rate-limited.

## Required UI notices

- On onboarding:
  - show "Quick free start" versus "Best quality (BYOK)" decision.
  - show plain-language privacy and retention summaries for the selected provider.
  - show legal notice before key submission.
- In settings:
  - show capability truth table (text, image, audio, grounding).
  - show trust tier and provider policy caveats.
- In solve/chat:
  - preserve educational framing and avoid presenting output as professional advice.

## Security baseline

- Never log raw user API keys.
- Keep local remembered keys encrypted at rest.
- For secure free mode, route requests through server-side controls with:
  - per-device/per-IP/per-session throttles
  - request size limits and model allowlist
  - abuse filters and temporary lockouts
  - strict origin checks

## Conservative Christian tutoring posture

- For worldview, moral, spiritual, and theological topics:
  - present Scripture and doctrine clearly
  - distinguish fact, inference, and prudential judgment
  - avoid manipulative claims and false certainty

## Compliance backlog

- Maintain updated Terms of Use and Privacy Notice linked from app surfaces.
- Add region-specific readiness tasks when needed (GDPR/UK GDPR and institutional requirements).
