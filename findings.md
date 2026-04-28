# Findings: Deep Provider Research

## Session Context
- Task: Debug/research/update AI providers
- Started: 2026-04-28


## Phase 2: Deep Research (2026-04-28)

### Sources Consulted
1. dataku.ai - 25 providers ranked by price/speed/reliability
2. infrabase.ai - 60 providers compared
3. inferencehub.org - 43+ providers catalog
4. aimodelsmap.com - 53 providers side-by-side
5. artificialanalysis.ai - 500+ model endpoints leaderboard
6. stackcompare.net - Top 8 LLM API providers
7. tokenmix.ai - 12 providers ranked
8. apiscout.dev - AI API market analysis

### Provider Coverage Map

Currently in registry (20 providers):
- gemini, openrouter, openai_compatible, custom_openai (4 main slots)
- openai, anthropic, deepseek, groq, together, fireworks, mistral, xai (8 popular)
- venice, ollama-cloud, perplexity, cerebras, sambanova (5 openai-compatible)
- deepinfra, cohere, novita, huggingface, nvidia-nim, vertex-ai (6 NEW)
- cloudflare-gateway, vercel-gateway, litellm (3 gateway)
- lmstudio, ollama (2 local)

Still missing from top-25 rankings:
1. Amazon Bedrock - OpenAI-compatible, huge enterprise presence
2. Azure OpenAI - OpenAI-compatible, huge enterprise presence
3. Hyperbolic - Growing, privacy-first, OpenAI-compatible, free credits
4. SiliconFlow - Strong price-to-performance ratio

### Criteria for adding
- Must have dedicated OpenAI-compatible API endpoint
- Must be independently popular/ranked in top-20 providers
- Must offer distinct model catalog or feature


## Phase 3: Added 4 More Providers

### New Providers Added
1. **Amazon Bedrock** (enterprise) — AWS-managed Claude/Llama/Mistral with SOC2/HIPAA compliance
2. **Azure OpenAI** (enterprise) — Microsoft-managed GPT models with data residency controls  
3. **Hyperbolic** (privacy-first) — Zero data retention, $10 free credits, DeepSeek/Llama/Qwen
4. **SiliconFlow** (performance) — High-performance open-source inference, price-to-performance leader

### Provider Catalog Size
- **Main slots**: 4 (gemini, openrouter, openai_compatible, custom_openai)
- **Presets**: 28 total (24 OpenAI-compatible + 2 local + 2 main)
- **Models with curated options**: 24 presets have explicit model dropdowns
- **Quick-select buttons on Step 1**: 13 (Gemini, ChatGPT, Claude, xAI, DeepInfra, Hugging Face, Cohere, Amazon Bedrock, Hyperbolic + all 4 main slots)

### Final Verification
- Tests: 75 pass, 0 fail, 273 expect() calls across 10 files
- Lint (tsc --noEmit): Clean
- Build (vite): Clean in 3.80s
- All 28 presets have docs URLs and key placeholders

