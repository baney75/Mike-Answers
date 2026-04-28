import type {
  OpenAICompatiblePreset,
  ProviderDescriptor,
  ProviderId,
  ProviderModelOption,
  ProviderPreferenceConfig,
  ProviderRuntimeConfig,
} from "../../types";

const browserByokNotice =
  "Browser BYOK keys are client-side by design. Local encrypted storage protects at rest on this device, not from malicious browser extensions, compromised devices, or pasted keys.";

const geminiModelOptions: ProviderModelOption[] = [
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", note: "Best free-tier default for fast student tutoring.", supportsImages: true },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Balanced multimodal work and grounded answers.", supportsImages: true },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Harder reasoning and long walkthroughs.", supportsImages: true },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash-Lite Preview", note: "Preview model; availability can change.", supportsImages: true },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", note: "Preview Pro tier; check current quota before relying on it.", supportsImages: true },
];

const openAIModelOptions: ProviderModelOption[] = [
  { id: "gpt-5.4-nano", label: "GPT-5.4 Nano", note: "Lowest-cost ChatGPT/OpenAI default for quick checks.", supportsImages: true },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", note: "Balanced everyday tutoring.", supportsImages: true },
  { id: "gpt-5.4", label: "GPT-5.4", note: "Stronger reasoning and writing.", supportsImages: true },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", note: "Compatibility fallback for older OpenAI accounts.", supportsImages: true },
  { id: "gpt-4.1", label: "GPT-4.1", note: "Compatibility fallback for older OpenAI accounts.", supportsImages: true },
];

const claudeModelOptions: ProviderModelOption[] = [
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", note: "Fast Claude option.", supportsImages: true },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", note: "Best default Claude tutoring balance.", supportsImages: true },
  { id: "claude-opus-4-7", label: "Claude Opus 4.7", note: "Premium Claude reasoning.", supportsImages: true },
];

const xAIModelOptions: ProviderModelOption[] = [
  { id: "grok-4-1-fast-non-reasoning", label: "Grok 4.1 Fast", note: "Fast xAI route.", supportsImages: true },
  { id: "grok-4-1-fast-reasoning", label: "Grok 4.1 Fast Reasoning", note: "Reasoning route.", supportsImages: true },
  { id: "grok-4.20-non-reasoning", label: "Grok 4.20", note: "Current flagship non-reasoning route when available.", supportsImages: true },
  { id: "grok-4.20-reasoning", label: "Grok 4.20 Reasoning", note: "Current flagship reasoning route when available.", supportsImages: true },
  { id: "grok-3-mini", label: "Grok 3 Mini", note: "Compatibility fallback.", supportsImages: false },
];

/** Curated Venice model ids — confirm names and vision support in the Venice docs or GET /models. */
const veniceModelOptions: ProviderModelOption[] = [
  {
    id: "zai-org-glm-5",
    label: "GLM 5",
    note: "Solid default routed through Venice. Small models below trade accuracy for speed and cost.",
    supportsImages: false,
  },
  {
    id: "zai-org-glm-5.1",
    label: "GLM 5.1",
    note: "Newer GLM tier on Venice; confirm availability on your API plan.",
    supportsImages: false,
  },
  {
    id: "qwen3-4b",
    label: "Qwen3 4B",
    note: "Economy-tier: quickest and cheapest but expect weaker math, coding, and long-context behavior.",
    supportsImages: false,
  },
  {
    id: "qwen3-vl-235b-a22b-instruct",
    label: "Qwen3 VL (vision)",
    note: "Vision-capable multimodal tier; heavier latency and quota use. Prefer for screenshots over tiny text models.",
    supportsImages: true,
  },
  {
    id: "llama3.3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
    note: "General instruct workhorse; slower than tiny models.",
    supportsImages: false,
  },
];

/** Ollama Cloud OpenAI-compat — list live models from `GET https://ollama.com/v1/models` with your key. Model tags change over time.
 */
const ollamaCloudModelOptions: ProviderModelOption[] = [
  {
    id: "llama3.2:3b-cloud",
    label: "Llama 3.2 3B (cloud)",
    note: "Economy-tier cloud latency; weaker on hard exams or subtle reasoning.",
    supportsImages: false,
  },
  {
    id: "glm-5:cloud",
    label: "GLM 5 (cloud)",
    note: "Larger hosted cloud slot; stronger general answers than tiny Llama trims.",
    supportsImages: false,
  },
  {
    id: "gpt-oss:120b-cloud",
    label: "gpt-oss 120B (cloud)",
    note: "Heavier reasoning and coding; slower and pricier. Confirm exact tag in /v1/models.",
    supportsImages: false,
  },
  {
    id: "qwen3-vl:235b-cloud",
    label: "Qwen3 VL 235B (cloud)",
    note: "Use for multimodal/screenshot solves. Large model: expect slow responses and quota impact.",
    supportsImages: true,
  },
];

const groqModelOptions: ProviderModelOption[] = [
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant",
    note: "Economy-tier: blazing fast; more frequent slips on calculus, proofs, or multi-step code vs 70B class.",
    supportsImages: false,
  },
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B Versatile",
    note: "Balanced tier for tutoring; still verify critical steps on exams.",
    supportsImages: false,
  },
];

const vercelGatewayModelOptions: ProviderModelOption[] = [
  { id: "openai/gpt-5.4-nano", label: "OpenAI GPT-5.4 Nano", note: "Fast gateway default.", supportsImages: true },
  { id: "openai/gpt-5.4", label: "OpenAI GPT-5.4", note: "Strong OpenAI route through Vercel.", supportsImages: true },
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", note: "Claude through Vercel Gateway.", supportsImages: true },
  { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6", note: "Premium Claude through Vercel Gateway.", supportsImages: true },
  { id: "xai/grok-4.1-fast-non-reasoning", label: "xAI Grok 4.1 Fast", note: "xAI through Vercel Gateway.", supportsImages: true },
  { id: "google/gemini-3.1-pro-preview", label: "Google Gemini 3.1 Pro Preview", note: "Gemini via Vercel when enabled.", supportsImages: true },
];

const deepseekModelOptions: ProviderModelOption[] = [
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    note: "Current fast default: 284B total / 13B active, 1M context, thinking mode on by default. Replaces deepseek-chat.",
    supportsImages: false,
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    note: "Heavy reasoning: 1.6T total / 49B active, 1M context. Use for hard math, proofs, or multi-step code.",
    supportsImages: false,
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek Chat (legacy)",
    note: "Deprecated July 2026. Maps to V4 Flash non-thinking mode.",
    supportsImages: false,
  },
  {
    id: "deepseek-reasoner",
    label: "DeepSeek Reasoner (legacy)",
    note: "Deprecated July 2026. Maps to V4 Flash thinking mode.",
    supportsImages: false,
  },
];

const deepInfraModelOptions: ProviderModelOption[] = [
  {
    id: "deepseek-ai/DeepSeek-R1-0528",
    label: "DeepSeek R1 0528",
    note: "Dedicated reasoning model with 655K context.",
    supportsImages: false,
  },
  {
    id: "deepseek-ai/DeepSeek-V3.1",
    label: "DeepSeek V3.1",
    note: "Flagship DeepSeek text model; 128K context.",
    supportsImages: false,
  },
  {
    id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    label: "Llama 4 Maverick",
    note: "Meta multimodal flagship; 1M context, image-capable.",
    supportsImages: true,
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    label: "Llama 3.3 70B Instruct",
    note: "Reliable open-weight workhorse; 131K context.",
    supportsImages: false,
  },
  {
    id: "Qwen/Qwen3.5-397B-A17B",
    label: "Qwen 3.5 397B-A17B",
    note: "Large MoE reasoning model; 128K context, top-tier open weight.",
    supportsImages: false,
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    label: "Qwen 2.5 72B",
    note: "Balanced large instruct model; 128K context.",
    supportsImages: false,
  },
  {
    id: "mistralai/Mistral-Small-24B-Instruct-2501",
    label: "Mistral Small 3 (24B)",
    note: "Compact versatile model; 128K context.",
    supportsImages: false,
  },
  {
    id: "zai-org/GLM-4.7-Flash",
    label: "GLM 4.7 Flash",
    note: "Fast GLM tier from z.ai; text-only.",
    supportsImages: false,
  },
  {
    id: "moonshotai/Kimi-K2.5",
    label: "Kimi K2.5",
    note: "Moonshot's multimodal model; image-capable.",
    supportsImages: true,
  },
];

const cohereModelOptions: ProviderModelOption[] = [
  {
    id: "command-a-03-2025",
    label: "Command A",
    note: "Flagship: strong reasoning/coding/tool use, 256K context. Use command-a-vision-07-2025 for image input.",
    supportsImages: false,
  },
  {
    id: "command-a-vision-07-2025",
    label: "Command A Vision",
    note: "Vision-capable variant of Command A; analyze charts, diagrams, and images. 128K context.",
    supportsImages: true,
  },
  {
    id: "command-a-reasoning-08-2025",
    label: "Command A Reasoning",
    note: "Reasoning-dedicated variant; thinks before outputting for nuanced problem-solving.",
    supportsImages: false,
  },
  {
    id: "command-r7b-12-2024",
    label: "Command R7B",
    note: "Lightweight efficient model; 128K context, excels at RAG and tool use.",
    supportsImages: false,
  },
];

const novitaModelOptions: ProviderModelOption[] = [
  {
    id: "deepseek-v3",
    label: "DeepSeek V3",
    note: "Budget DeepSeek route via Novita; 128K context.",
    supportsImages: false,
  },
  {
    id: "deepseek-r1",
    label: "DeepSeek R1",
    note: "DeepSeek reasoning model on Novita.",
    supportsImages: false,
  },
  {
    id: "llama-3.3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
    note: "Solid general-purpose workhorse.",
    supportsImages: false,
  },
  {
    id: "llama-3.1-8b-instruct",
    label: "Llama 3.1 8B Instruct",
    note: "Lightning-fast light option for simple tasks.",
    supportsImages: false,
  },
  {
    id: "qwen-2.5-72b-instruct",
    label: "Qwen 2.5 72B Instruct",
    note: "Large instruct model; 128K context.",
    supportsImages: false,
  },
  {
    id: "mistral-7b-instruct",
    label: "Mistral 7B Instruct",
    note: "Very fast / lightweight Mistral option.",
    supportsImages: false,
  },
];

const huggingfaceModelOptions: ProviderModelOption[] = [
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    label: "Llama 3.3 70B Instruct",
    note: "Reliable open-weight workhorse via HF Inference.",
    supportsImages: false,
  },
  {
    id: "meta-llama/Llama-3.1-8B-Instruct",
    label: "Llama 3.1 8B Instruct",
    note: "Fast lightweight option on HF Inference.",
    supportsImages: false,
  },
  {
    id: "microsoft/Phi-4-mini-instruct",
    label: "Phi-4 Mini",
    note: "Efficient small model from Microsoft Research.",
    supportsImages: false,
  },
  {
    id: "google/gemma-3-12b-it",
    label: "Gemma 3 12B",
    note: "Multimodal vision model from Google; image-capable.",
    supportsImages: true,
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    label: "Qwen 2.5 72B",
    note: "Balanced large instruct model.",
    supportsImages: false,
  },
  {
    id: "mistralai/Mistral-7B-Instruct-v0.3",
    label: "Mistral 7B v0.3",
    note: "Lightweight open-weight Mistral option.",
    supportsImages: false,
  },
];

const nvidiaNimModelOptions: ProviderModelOption[] = [
  {
    id: "nvidia/llama-3.1-nemotron-70b-instruct",
    label: "Llama Nemotron 3 70B",
    note: "NVIDIA-optimized Llama variant; agentic tasks and reasoning.",
    supportsImages: false,
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    note: "Flagship open-weight model via NVIDIA NIM.",
    supportsImages: false,
  },
  {
    id: "meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B",
    note: "Lightweight fast option on NVIDIA NIM.",
    supportsImages: false,
  },
  {
    id: "mistralai/mistral-large-3-675b-instruct",
    label: "Mistral Large 3 (675B)",
    note: "Top-tier open-weight model; vision-capable.",
    supportsImages: true,
  },
  {
    id: "google/gemma-3-12b-it",
    label: "Gemma 3 12B",
    note: "Google open multimodal model; image-capable.",
    supportsImages: true,
  },
];

const vertexAIModelOptions: ProviderModelOption[] = [
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    note: "Balanced multimodal model via Vertex AI.",
    supportsImages: true,
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    note: "Stronger reasoning and long walkthroughs via Vertex.",
    supportsImages: true,
  },
  {
    id: "google/gemini-3.1-flash-lite-preview",
    label: "Gemini 3.1 Flash-Lite Preview",
    note: "Preview flash tier via Vertex AI.",
    supportsImages: true,
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    note: "Open model routed through Vertex AI.",
    supportsImages: false,
  },
  {
    id: "mistralai/mistral-large-3-675b-instruct",
    label: "Mistral Large 3 (675B)",
    note: "Mistral flagship via Vertex AI; vision-capable.",
    supportsImages: true,
  },
];

const bedrockModelOptions: ProviderModelOption[] = [
  {
    id: "anthropic.claude-sonnet-4-6-v1",
    label: "Claude Sonnet 4.6",
    note: "Claude via AWS Bedrock; balanced reasoning and speed.",
    supportsImages: true,
  },
  {
    id: "anthropic.claude-opus-4-7-v1",
    label: "Claude Opus 4.7",
    note: "Premium Claude via AWS Bedrock; hardest reasoning.",
    supportsImages: true,
  },
  {
    id: "anthropic.claude-haiku-4-5-v1",
    label: "Claude Haiku 4.5",
    note: "Fast Claude via AWS Bedrock; lightweight tasks.",
    supportsImages: true,
  },
  {
    id: "meta.llama4-maverick-17b-128e-instruct",
    label: "Llama 4 Maverick",
    note: "Multimodal Llama via Bedrock; 1M context.",
    supportsImages: true,
  },
  {
    id: "meta.llama3-3-70b-instruct-v1",
    label: "Llama 3.3 70B",
    note: "Open-weight workhorse via AWS Bedrock.",
    supportsImages: false,
  },
  {
    id: "mistral.mistral-large-3-675b-instruct",
    label: "Mistral Large 3 (675B)",
    note: "Mistral flagship via AWS Bedrock.",
    supportsImages: true,
  },
];

const azureModelOptions: ProviderModelOption[] = [
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    note: "Flagship GPT via Azure; enterprise compliance.",
    supportsImages: true,
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    note: "Balanced GPT via Azure; everyday tutoring.",
    supportsImages: true,
  },
  {
    id: "gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    note: "Lowest-cost GPT via Azure.",
    supportsImages: true,
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    note: "Compatibility fallback via Azure.",
    supportsImages: true,
  },
];

const hyperbolicModelOptions: ProviderModelOption[] = [
  {
    id: "deepseek-ai/DeepSeek-R1-0528",
    label: "DeepSeek R1 0528",
    note: "Dedicated reasoning model; 164K context, strong on complex logic.",
    supportsImages: false,
  },
  {
    id: "deepseek-ai/DeepSeek-V3-0324",
    label: "DeepSeek V3 (0324)",
    note: "Latest DeepSeek V3 checkpoint; 131K context, strong reasoning.",
    supportsImages: false,
  },
  {
    id: "meta-llama/Meta-Llama-3.1-405B-Instruct",
    label: "Llama 3.1 405B Instruct",
    note: "Largest Llama instruct model via Hyperbolic; 131K context.",
    supportsImages: false,
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    label: "Llama 3.3 70B Instruct",
    note: "Reliable workhorse through Hyperbolic; 131K context.",
    supportsImages: false,
  },
  {
    id: "meta-llama/Llama-3.2-3B-Instruct",
    label: "Llama 3.2 3B Instruct",
    note: "Compact fast option via Hyperbolic; 131K context.",
    supportsImages: false,
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    label: "Qwen 2.5 72B",
    note: "Large instruct model via Hyperbolic; 131K context.",
    supportsImages: false,
  },
  {
    id: "Qwen/QwQ-32B",
    label: "QwQ 32B",
    note: "Reasoning-focused Qwen model; strong math and logic.",
    supportsImages: false,
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    note: "Open-weight GPT model via Hyperbolic.",
    supportsImages: false,
  },
];

const siliconFlowModelOptions: ProviderModelOption[] = [
  {
    id: "deepseek-ai/DeepSeek-V3",
    label: "DeepSeek V3",
    note: "Popular DeepSeek route via SiliconFlow.",
    supportsImages: false,
  },
  {
    id: "Qwen/Qwen3.5-397B-A17B",
    label: "Qwen 3.5 397B-A17B",
    note: "Large MoE reasoning model via SiliconFlow; 128K context.",
    supportsImages: false,
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    label: "Qwen 2.5 72B",
    note: "Balanced large instruct model via SiliconFlow.",
    supportsImages: false,
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    label: "Llama 3.3 70B Instruct",
    note: "Reliable open-weight workhorse via SiliconFlow.",
    supportsImages: false,
  },
  {
    id: "mistralai/Mistral-7B-Instruct-v0.3",
    label: "Mistral 7B v0.3",
    note: "Lightweight open-weight option via SiliconFlow.",
    supportsImages: false,
  },
];

const togetherModelOptions: ProviderModelOption[] = [
  {
    id: "deepseek-ai/DeepSeek-V4-Flash",
    label: "DeepSeek V4 Flash",
    note: "Fast lightweight route through Together, 1M context.",
    supportsImages: false,
  },
  {
    id: "deepseek-ai/DeepSeek-V4-Pro",
    label: "DeepSeek V4 Pro",
    note: "Heavy reasoning route, 1M context.",
    supportsImages: false,
  },
  {
    id: "deepseek-ai/DeepSeek-R1",
    label: "DeepSeek R1",
    note: "Dedicated reasoning model (0528 build).",
    supportsImages: false,
  },
  {
    id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    label: "Llama 4 Maverick",
    note: "Meta's latest multimodal, 1M context, image-capable.",
    supportsImages: true,
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    label: "Llama 3.3 70B Turbo",
    note: "Popular general-purpose workhorse, 131K context.",
    supportsImages: false,
  },
  {
    id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    label: "Llama 3.1 8B Turbo",
    note: "Lightning-fast light option, 131K context.",
    supportsImages: false,
  },
  {
    id: "Qwen/Qwen3.5-397B-A17B",
    label: "Qwen 3.5 397B",
    note: "Large Qwen model for harder tasks.",
    supportsImages: false,
  },
  {
    id: "Qwen/Qwen2.5-7B-Instruct-Turbo",
    label: "Qwen 2.5 7B Turbo",
    note: "Very fast / lightweight Qwen option.",
    supportsImages: false,
  },
  {
    id: "mistralai/Mistral-Small-24B-Instruct-2501",
    label: "Mistral Small 3 (24B)",
    note: "Compact versatile model through Together.",
    supportsImages: false,
  },
];

const fireworksModelOptions: ProviderModelOption[] = [
  {
    id: "accounts/fireworks/models/deepseek-v3p2",
    label: "DeepSeek V3.2",
    note: "Popular DeepSeek build on Fireworks.",
    supportsImages: false,
  },
  {
    id: "accounts/fireworks/models/deepseek-r1-0528",
    label: "DeepSeek R1 0528",
    note: "Dedicated reasoning model.",
    supportsImages: false,
  },
  {
    id: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
    note: "Solid general-purpose workhorse.",
    supportsImages: false,
  },
  {
    id: "accounts/fireworks/models/kimi-k2-6",
    label: "Kimi K2.6",
    note: "Moonshot's latest, multimodal-capable.",
    supportsImages: true,
  },
  {
    id: "accounts/fireworks/models/mistral-large-3-675b-instruct-2512",
    label: "Mistral Large 3 (675B)",
    note: "Top-tier open-weight model, vision-capable.",
    supportsImages: true,
  },
  {
    id: "accounts/fireworks/models/ministral-3-8b-instruct-2512",
    label: "Ministral 3 8B",
    note: "Lightweight multimodal option.",
    supportsImages: true,
  },
];

const mistralModelOptions: ProviderModelOption[] = [
  {
    id: "mistral-large-2512",
    label: "Mistral Large 3",
    note: "Flagship: 675B total / 41B active, multimodal, 256K context.",
    supportsImages: true,
  },
  {
    id: "mistral-small-2603",
    label: "Mistral Small 4",
    note: "Hybrid instruct/reason/code, 119B total / 6.5B active, multimodal.",
    supportsImages: true,
  },
  {
    id: "mistral-small-2506",
    label: "Mistral Small 3.2",
    note: "Previous-gen small model, text-only.",
    supportsImages: false,
  },
  {
    id: "ministral-8b-2512",
    label: "Ministral 3 8B",
    note: "Efficient multimodal, good for lightweight tasks.",
    supportsImages: true,
  },
  {
    id: "codestral-2508",
    label: "Codestral",
    note: "Code completion and generation specialist.",
    supportsImages: false,
  },
];

const perplexityModelOptions: ProviderModelOption[] = [
  {
    id: "sonar",
    label: "Sonar",
    note: "Built-in web search with inline citations. Fast and lightweight.",
    supportsImages: true,
  },
  {
    id: "sonar-pro",
    label: "Sonar Pro",
    note: "Deeper search with Pro multi-step reasoning. Higher quality.",
    supportsImages: true,
  },
  {
    id: "sonar-deep-research",
    label: "Sonar Deep Research",
    note: "Deep research mode with comprehensive multi-step investigation.",
    supportsImages: true,
  },
  {
    id: "sonar-reasoning-pro",
    label: "Sonar Reasoning Pro",
    note: "Reasoning-dedicated with chain-of-thought and enhanced retrieval.",
    supportsImages: true,
  },
];

const cerebrasModelOptions: ProviderModelOption[] = [
  {
    id: "llama3.1-8b",
    label: "Llama 3.1 8B",
    note: "Production: ~2200 tok/s, extremely fast. Deprecated May 2026.",
    supportsImages: false,
  },
  {
    id: "gpt-oss-120b",
    label: "OpenAI GPT-OSS 120B",
    note: "Production: ~3000 tok/s, fastest deep route on Cerebras.",
    supportsImages: false,
  },
  {
    id: "zai-glm-4.7",
    label: "Z.ai GLM 4.7",
    note: "Preview: ~1000 tok/s, 355B params.",
    supportsImages: false,
  },
];

const sambanovaModelOptions: ProviderModelOption[] = [
  {
    id: "DeepSeek-R1-0528",
    label: "DeepSeek R1 0528",
    note: "Dedicated reasoning model, popular choice.",
    supportsImages: false,
  },
  {
    id: "DeepSeek-V3.2",
    label: "DeepSeek V3.2",
    note: "Latest DeepSeek text/reasoning build.",
    supportsImages: false,
  },
  {
    id: "Meta-Llama-3.1-8B-Instruct",
    label: "Llama 3.1 8B",
    note: "Lightweight fast option.",
    supportsImages: false,
  },
  {
    id: "Meta-Llama-3.3-70B-Instruct",
    label: "Llama 3.3 70B",
    note: "Reliable general-purpose workhorse.",
    supportsImages: false,
  },
  {
    id: "Llama-4-Maverick-17B-128E-Instruct",
    label: "Llama 4 Maverick",
    note: "Multimodal vision-capable model.",
    supportsImages: true,
  },
  {
    id: "gemma-3-12b-it",
    label: "Gemma 3 12B",
    note: "Multimodal vision model from Google.",
    supportsImages: true,
  },
  {
    id: "gpt-oss-120b",
    label: "OpenAI GPT-OSS 120B",
    note: "Fast inference option on SambaNova.",
    supportsImages: false,
  },
];

export const providerDescriptors: Record<ProviderId, ProviderDescriptor> = {
  gemini: {
    id: "gemini",
    kind: "gemini_native",
    label: "Gemini",
    shortDescription: "Best student default: Google AI Studio has a free Gemini API tier, native image solving, grounding, and audio transcription.",
    docsUrl: "https://aistudio.google.com/app/apikey",
    apiKeyPlaceholder: "AIza...",
    defaultModels: {
      fastModel: "gemini-2.5-flash-lite",
      deepModel: "gemini-2.5-pro",
      groundedModel: "gemini-2.5-flash",
      transcriptionModel: "gemini-2.5-flash-lite",
    },
    modelOptions: geminiModelOptions,
    capabilities: {
      supportsGrounding: true,
      supportsImageInputInBrowser: true,
      supportsAudioTranscription: true,
      supportsCustomBaseUrl: false,
      supportsModelCatalog: false,
      requiresApiKey: true,
    },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Your own Gemini key keeps account control with you.",
      retentionSummary: "Retention and logging follow Google's provider policy.",
      trainingSummary: "Training behavior depends on Google's product terms for your key/project.",
      legalNotice: "Review provider terms before uploading sensitive educational or personal data.",
    },
  },
  openrouter: {
    id: "openrouter",
    kind: "openai_compatible",
    label: "OpenRouter",
    shortDescription: "Free-model backup path with broad model discovery and flexible routing.",
    docsUrl: "https://openrouter.ai/keys",
    apiKeyPlaceholder: "sk-or-v1-...",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModels: {
      fastModel: "",
      deepModel: "",
    },
    capabilities: {
      supportsGrounding: false,
      supportsImageInputInBrowser: true,
      supportsAudioTranscription: false,
      supportsCustomBaseUrl: false,
      supportsModelCatalog: true,
      requiresApiKey: true,
      isGateway: true,
    },
    policy: {
      trustTier: "free_trial",
      privacySummary: "Routes through OpenRouter and selected upstream model providers.",
      retentionSummary: "Retention varies by upstream provider and your OpenRouter settings.",
      trainingSummary: "Training policies vary per provider; verify before sharing sensitive content.",
      legalNotice: "Use the provider privacy controls and free-model constraints deliberately.",
    },
  },
  openai_compatible: {
    id: "openai_compatible",
    kind: "openai_compatible",
    label: "Provider catalog",
    shortDescription: "Searchable BYOK presets for OpenAI-compatible APIs, gateways, local servers, and hosted inference.",
    docsUrl: "https://platform.openai.com/docs/api-reference",
    apiKeyPlaceholder: "Paste the selected provider key",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModels: {
      fastModel: "gpt-4.1-mini",
      deepModel: "gpt-4.1",
    },
    capabilities: {
      supportsGrounding: false,
      supportsImageInputInBrowser: true,
      supportsAudioTranscription: false,
      supportsCustomBaseUrl: true,
      supportsModelCatalog: false,
      requiresApiKey: true,
    },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly from this browser to the selected OpenAI-compatible provider.",
      retentionSummary: "Retention depends on the selected preset provider and account settings.",
      trainingSummary: "Training usage depends on the selected provider policy.",
      legalNotice: browserByokNotice,
    },
  },
  custom_openai: {
    id: "custom_openai",
    kind: "openai_compatible",
    label: "Custom OpenAI-compatible",
    shortDescription: "Manual base URL, key, and model slots for ChatGPT-compatible or other compatible providers.",
    docsUrl: "https://platform.openai.com/docs/api-reference",
    apiKeyPlaceholder: "Enter API key",
    defaultBaseUrl: "",
    defaultModels: {
      fastModel: "",
      deepModel: "",
    },
    capabilities: {
      supportsGrounding: false,
      supportsImageInputInBrowser: false,
      supportsAudioTranscription: false,
      supportsCustomBaseUrl: true,
      supportsModelCatalog: false,
      requiresApiKey: true,
    },
    policy: {
      trustTier: "enterprise_ready",
      privacySummary: "Privacy depends on the provider you configure.",
      retentionSummary: "Retention depends on your configured endpoint and account contract.",
      trainingSummary: "Training usage depends entirely on your chosen provider policy.",
      legalNotice: "You are responsible for verifying data-processing and contractual compliance.",
    },
  },
};

export const providerOrder: ProviderId[] = [
  "gemini",
  "openrouter",
  "openai_compatible",
  "custom_openai",
];

export const recommendedProviderIds: ProviderId[] = [
  "gemini",
  "openai_compatible",
  "openrouter",
  "custom_openai",
];

export const openAICompatiblePresets: OpenAICompatiblePreset[] = [
  {
    id: "openai",
    label: "ChatGPT / OpenAI",
    group: "popular",
    shortDescription: "Official OpenAI endpoint for GPT models. This is the closest BYOK route to ChatGPT-style answers.",
    docsUrl: "https://platform.openai.com/api-keys",
    apiKeyPlaceholder: "sk-...",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModels: { fastModel: "gpt-5.4-nano", deepModel: "gpt-5.4" },
    modelOptions: openAIModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to OpenAI with your own project key.",
      retentionSummary: "Retention follows your OpenAI account and API data controls.",
      trainingSummary: "Training usage follows OpenAI API terms and account settings.",
      legalNotice: browserByokNotice,
    },
    aliases: ["chatgpt", "gpt", "open ai"],
  },
  {
    id: "anthropic",
    label: "Claude / Anthropic",
    group: "popular",
    shortDescription: "Claude through Anthropic's official OpenAI-compatible testing layer. Native Claude API still has the fullest feature set.",
    docsUrl: "https://docs.anthropic.com/en/api/openai-sdk",
    apiKeyPlaceholder: "sk-ant-...",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModels: { fastModel: "claude-haiku-4-5", deepModel: "claude-sonnet-4-6" },
    modelOptions: claudeModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Anthropic with your Claude API key.",
      retentionSummary: "Retention follows Anthropic API policy and account settings.",
      trainingSummary: "Training usage follows Anthropic API policy.",
      legalNotice: `${browserByokNotice} Anthropic says the OpenAI compatibility layer is best for testing/comparison; use native Claude API for the full Claude feature set.`,
    },
    aliases: ["claude", "anthropic", "sonnet", "opus"],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    group: "popular",
    shortDescription: "Low-cost OpenAI-compatible text models with strong coding and reasoning options. V4 Flash is the new fast default (deepseek-chat deprecated July 2026).",
    docsUrl: "https://api-docs.deepseek.com/",
    apiKeyPlaceholder: "sk-...",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModels: { fastModel: "deepseek-v4-flash", deepModel: "deepseek-v4-pro" },
    modelOptions: deepseekModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: false },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to DeepSeek with your key.",
      retentionSummary: "Retention follows DeepSeek platform policy.",
      trainingSummary: "Training usage follows DeepSeek API policy.",
      legalNotice: browserByokNotice,
    },
  },
  {
    id: "groq",
    label: "Groq",
    group: "popular",
    shortDescription: "Very fast OpenAI-compatible inference for supported open models.",
    docsUrl: "https://console.groq.com/keys",
    apiKeyPlaceholder: "gsk_...",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModels: { fastModel: "llama-3.1-8b-instant", deepModel: "llama-3.3-70b-versatile" },
    modelOptions: groqModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: false },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Groq Cloud with your key.",
      retentionSummary: "Retention follows Groq Cloud policy.",
      trainingSummary: "Training usage follows Groq Cloud policy.",
      legalNotice: browserByokNotice,
    },
  },
  {
    id: "together",
    label: "Together AI",
    group: "openai_compatible",
    shortDescription: "OpenAI-compatible hosted open models with broad model choice. Model IDs use organization/slug format.",
    docsUrl: "https://api.together.ai/settings/api-keys",
    apiKeyPlaceholder: "Paste Together API key",
    defaultBaseUrl: "https://api.together.xyz/v1",
    defaultModels: { fastModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", deepModel: "deepseek-ai/DeepSeek-R1" },
    modelOptions: togetherModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: false },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Together AI with your key.",
      retentionSummary: "Retention follows Together AI policy.",
      trainingSummary: "Training usage follows Together AI policy.",
      legalNotice: browserByokNotice,
    },
  },
  {
    id: "fireworks",
    label: "Fireworks AI",
    group: "openai_compatible",
    shortDescription: "OpenAI-compatible hosted models with fast inference and popular open-weight choices. Model IDs use accounts/fireworks/models/slug format.",
    docsUrl: "https://fireworks.ai/account/api-keys",
    apiKeyPlaceholder: "fw_...",
    defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
    defaultModels: {
      fastModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
      deepModel: "accounts/fireworks/models/deepseek-v3p2",
    },
    modelOptions: fireworksModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: false },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Fireworks AI with your key.",
      retentionSummary: "Retention follows Fireworks AI policy.",
      trainingSummary: "Training usage follows Fireworks AI policy.",
      legalNotice: browserByokNotice,
    },
  },
  {
    id: "mistral",
    label: "Mistral",
    group: "openai_compatible",
    shortDescription: "Mistral's OpenAI-compatible endpoint for European-hosted model options. Many models now support vision (Small 4, Large 3, Ministral 3).",
    docsUrl: "https://console.mistral.ai/api-keys/",
    apiKeyPlaceholder: "Paste Mistral API key",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    defaultModels: { fastModel: "mistral-small-2603", deepModel: "mistral-large-2512" },
    modelOptions: mistralModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Mistral with your key.",
      retentionSummary: "Retention follows Mistral account and API policy.",
      trainingSummary: "Training usage follows Mistral API policy.",
      legalNotice: browserByokNotice,
    },
  },
  {
    id: "xai",
    label: "xAI",
    group: "popular",
    shortDescription: "OpenAI-compatible access to Grok models with text and image chat support on capable models.",
    docsUrl: "https://docs.x.ai/docs/api-reference",
    apiKeyPlaceholder: "xai-...",
    defaultBaseUrl: "https://api.x.ai/v1",
    defaultModels: { fastModel: "grok-4-1-fast-non-reasoning", deepModel: "grok-4-1-fast-reasoning" },
    modelOptions: xAIModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to xAI with your key.",
      retentionSummary: "Retention follows xAI API policy.",
      trainingSummary: "Training usage follows xAI API policy.",
      legalNotice: browserByokNotice,
    },
    aliases: ["grok", "twitter", "x"],
  },
  {
    id: "venice",
    label: "Venice.ai",
    group: "popular",
    shortDescription:
      "OpenAI-compatible inference with privacy-first routing. Official docs expose built-in optional web-assisted answers alongside chat (enable via Venice parameters). Bring your Venice API key.",
    docsUrl: "https://docs.venice.ai/",
    apiKeyPlaceholder: "Venice API key",
    defaultBaseUrl: "https://api.venice.ai/api/v1",
    defaultModels: { fastModel: "zai-org-glm-5", deepModel: "zai-org-glm-5.1" },
    modelOptions: veniceModelOptions,
    capabilities: {
      ...providerDescriptors.openai_compatible.capabilities,
      supportsImageInputInBrowser: true,
      supportsGrounding: false,
    },
    policy: {
      trustTier: "byok_recommended",
      privacySummary:
        "Venice emphasizes user-controlled inference; review current Venice.ai policies for retention and routing.",
      retentionSummary:
        "Retention characteristics follow Venice and any upstream inference partner they route to for selected models.",
      trainingSummary:
        "Training/eligibility differs by routed model tier; validate in Venice dashboard and upstream terms.",
      legalNotice: `${browserByokNotice} Web-assisted answers are generated by Venice and linked sources—independently verify for graded work.`,
    },
    aliases: ["venice ai", "vennice", "venice.ai", "venice inference"],
  },
  {
    id: "ollama-cloud",
    label: "Ollama Cloud",
    group: "popular",
    shortDescription:
      "Hosted Ollama models via OpenAI-compatible HTTPS at ollama.com (API key auth). Separate from localhost Ollama. Use `:cloud`-tag models from your account list for remote inference.",
    docsUrl: "https://docs.ollama.com/cloud",
    apiKeyPlaceholder: "Ollama API key (ollama.com/settings/keys)",
    defaultBaseUrl: "https://ollama.com/v1",
    defaultModels: { fastModel: "glm-5:cloud", deepModel: "gpt-oss:120b-cloud" },
    modelOptions: ollamaCloudModelOptions,
    capabilities: {
      ...providerDescriptors.openai_compatible.capabilities,
      requiresApiKey: true,
      supportsCustomBaseUrl: false,
      supportsImageInputInBrowser: true,
    },
    policy: {
      trustTier: "byok_recommended",
      privacySummary:
        "Routes to Ollama cloud infrastructure with your Ollama account key; distinct from purely local localhost runs.",
      retentionSummary:
        "Retention/logging follow Ollama cloud policy for your workspace.",
      trainingSummary:
        "Training posture follows Ollama's published stance for hosted inference.",
      legalNotice:
        `${browserByokNotice} Confirm model identifiers with GET https://ollama.com/v1/models; cloud tags evolve over time.`,
    },
    aliases: ["ollama cloud", "ollama hosted", "ollama remote"],
  },
  {
    id: "perplexity",
    label: "Perplexity",
    group: "openai_compatible",
    shortDescription: "OpenAI-compatible online models with built-in web search, citations, and optional deep research. All Sonar models include web search natively.",
    docsUrl: "https://www.perplexity.ai/settings/api",
    apiKeyPlaceholder: "pplx-...",
    defaultBaseUrl: "https://api.perplexity.ai",
    defaultModels: { fastModel: "sonar", deepModel: "sonar-pro" },
    modelOptions: perplexityModelOptions,
    capabilities: {
      ...providerDescriptors.openai_compatible.capabilities,
      supportsImageInputInBrowser: true,
      supportsGrounding: true,
    },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Perplexity with your key.",
      retentionSummary: "Retention follows Perplexity API policy.",
      trainingSummary: "Training usage follows Perplexity API policy.",
      legalNotice: browserByokNotice,
    },
    aliases: ["sonar"],
  },
  {
    id: "cerebras",
    label: "Cerebras",
    group: "openai_compatible",
    shortDescription: "OpenAI-compatible fast inference for selected open models. Focuses on inference speed (1000-3000 tok/s).",
    docsUrl: "https://cloud.cerebras.ai/platform/",
    apiKeyPlaceholder: "csk-...",
    defaultBaseUrl: "https://api.cerebras.ai/v1",
    defaultModels: { fastModel: "llama3.1-8b", deepModel: "gpt-oss-120b" },
    modelOptions: cerebrasModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: false },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Cerebras Cloud with your key.",
      retentionSummary: "Retention follows Cerebras Cloud policy.",
      trainingSummary: "Training usage follows Cerebras Cloud policy.",
      legalNotice: browserByokNotice,
    },
  },
  {
    id: "sambanova",
     label: "SambaNova",
     group: "openai_compatible",
     shortDescription: "OpenAI-compatible hosted inference for Llama, DeepSeek, Qwen, and vision models. Broad model catalog with fast ASIC hardware.",
     docsUrl: "https://cloud.sambanova.ai/apis",
     apiKeyPlaceholder: "Paste SambaNova API key",
     defaultBaseUrl: "https://api.sambanova.ai/v1",
     defaultModels: { fastModel: "Meta-Llama-3.1-8B-Instruct", deepModel: "Meta-Llama-3.3-70B-Instruct" },
     modelOptions: sambanovaModelOptions,
     capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to SambaNova Cloud with your key.",
      retentionSummary: "Retention follows SambaNova Cloud policy.",
      trainingSummary: "Training usage follows SambaNova Cloud policy.",
      legalNotice: browserByokNotice,
    },
  },
  {
    id: "deepinfra",
    label: "DeepInfra",
    group: "popular",
    shortDescription: "Serverless OpenAI-compatible inference for broad open-source model catalog including DeepSeek, Llama, Qwen, Mistral, GLM, and custom deployments.",
    docsUrl: "https://deepinfra.com/",
    apiKeyPlaceholder: "Paste DeepInfra API key (deepinfra.com/auth)",
    defaultBaseUrl: "https://api.deepinfra.com/v1/openai",
    defaultModels: { fastModel: "Qwen/Qwen2.5-72B-Instruct", deepModel: "deepseek-ai/DeepSeek-R1-0528" },
    modelOptions: deepInfraModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to DeepInfra with your key.",
      retentionSummary: "Retention follows DeepInfra policy as a serverless inference provider.",
      trainingSummary: "DeepInfra does not train on API inference traffic.",
      legalNotice: browserByokNotice,
    },
    aliases: ["deep infra", "deepinfra"],
  },
  {
    id: "cohere",
    label: "Cohere",
    group: "popular",
    shortDescription: "Enterprise-focused NLP platform; Command A/R models for RAG, reasoning, and tool use. OpenAI-compatible API with trial credits.",
    docsUrl: "https://docs.cohere.com/docs/openai-compatibility",
    apiKeyPlaceholder: "Paste Cohere API key (dashboard.cohere.com)",
    defaultBaseUrl: "https://api.cohere.ai/compatibility/v1",
    defaultModels: { fastModel: "command-r7b-12-2024", deepModel: "command-a-03-2025" },
    modelOptions: cohereModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Cohere with your key.",
      retentionSummary: "Retention follows Cohere API policy.",
      trainingSummary: "Training usage follows Cohere API policy; API data is not used for training by default.",
      legalNotice: browserByokNotice,
    },
    aliases: ["command", "cohere ai"],
  },
  {
    id: "novita",
    label: "Novita AI",
    group: "openai_compatible",
    shortDescription: "Budget-friendly OpenAI-compatible API with LLMs, image, video, and audio in one platform. Strong DeepSeek and Llama coverage.",
    docsUrl: "https://novita.ai/docs/api-keys.html",
    apiKeyPlaceholder: "Paste Novita API key",
    defaultBaseUrl: "https://api.novita.ai/v3/openai",
    defaultModels: { fastModel: "llama-3.1-8b-instruct", deepModel: "deepseek-v3" },
    modelOptions: novitaModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: false },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Novita AI with your key.",
      retentionSummary: "Retention follows Novita AI platform policy.",
      trainingSummary: "Training usage follows Novita AI API policy.",
      legalNotice: browserByokNotice,
    },
    aliases: ["novita"],
  },
  {
    id: "huggingface",
    label: "Hugging Face Inference",
    group: "popular",
    shortDescription: "OpenAI-compatible inference for 700K+ community and first-party models via Hugging Face's Inference API. Insert any model ID from the hub.",
    docsUrl: "https://huggingface.co/docs/api-inference/en/openai-compatibility",
    apiKeyPlaceholder: "HF API token (huggingface.co/settings/tokens)",
    defaultBaseUrl: "https://router.huggingface.co/hf-inference/v1",
    defaultModels: { fastModel: "meta-llama/Llama-3.1-8B-Instruct", deepModel: "meta-llama/Llama-3.3-70B-Instruct" },
    modelOptions: huggingfaceModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to Hugging Face Inference API with your token.",
      retentionSummary: "Retention follows Hugging Face Inference API policy.",
      trainingSummary: "Training usage follows Hugging Face terms; free tier inference is rate-limited.",
      legalNotice: browserByokNotice,
    },
    aliases: ["huggingface", "hf", "hugging face"],
  },
  {
    id: "nvidia-nim",
    label: "NVIDIA NIM",
    group: "openai_compatible",
    shortDescription: "OpenAI-compatible inference through NVIDIA's optimized microservices (NIM). Optimized Llama, Nemotron, Mistral, and Gemma models on build.nvidia.com.",
    docsUrl: "https://build.nvidia.com/docs",
    apiKeyPlaceholder: "NVIDIA API key (build.nvidia.com)",
    defaultBaseUrl: "https://integrate.api.nvidia.com/v1",
    defaultModels: { fastModel: "meta/llama-3.1-8b-instruct", deepModel: "nvidia/llama-3.1-nemotron-70b-instruct" },
    modelOptions: nvidiaNimModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to NVIDIA cloud inference with your key.",
      retentionSummary: "Retention follows NVIDIA API policy.",
      trainingSummary: "Training usage follows NVIDIA API policy.",
      legalNotice: browserByokNotice,
    },
    aliases: ["nvidia", "nim", "build.nvidia"],
  },
  {
    id: "vertex-ai",
    label: "Google Vertex AI",
    group: "openai_compatible",
    shortDescription: "OpenAI-compatible access to Google Cloud's Vertex AI model catalog including Gemini, Llama, Mistral, and more. Requires GCP project with Vertex AI enabled.",
    docsUrl: "https://cloud.google.com/vertex-ai/generative-ai/docs/openai-compatible",
    apiKeyPlaceholder: "GCP service account key or access token",
    defaultBaseUrl: "https://us-central1-aiplatform.googleapis.com/v1beta1",
    defaultModels: { fastModel: "google/gemini-2.5-flash", deepModel: "google/gemini-2.5-pro" },
    modelOptions: vertexAIModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: true, isUserPays: true },
    policy: {
      trustTier: "enterprise_ready",
      privacySummary: "Routes through your GCP project with full IAM and VPC-SC controls.",
      retentionSummary: "Retention follows your GCP data processing and Vertex AI settings.",
      trainingSummary: "Training usage follows GCP terms; your data is not used to train foundation models by default.",
      legalNotice: "Vertex AI requires a Google Cloud project with billing enabled. Confirm model availability and regional compliance.",
    },
    aliases: ["vertex", "gcp vertex", "google cloud"],
  },
  {
    id: "bedrock",
    label: "Amazon Bedrock",
    group: "openai_compatible",
    shortDescription: "AWS Bedrock with OpenAI-compatible API. Access Claude, Llama, Mistral, and Amazon models through your AWS account with enterprise compliance and security.",
    docsUrl: "https://docs.aws.amazon.com/bedrock/latest/userguide/api-setup.html",
    apiKeyPlaceholder: "AWS access key or session token",
    defaultBaseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com/v1",
    defaultModels: { fastModel: "anthropic.claude-haiku-4-5-v1", deepModel: "anthropic.claude-sonnet-4-6-v1" },
    modelOptions: bedrockModelOptions,
    capabilities: {
      ...providerDescriptors.openai_compatible.capabilities,
      supportsImageInputInBrowser: true,
      isUserPays: true,
    },
    policy: {
      trustTier: "enterprise_ready",
      privacySummary: "Routes through your AWS account with IAM, KMS, and VPC controls.",
      retentionSummary: "Retention follows AWS Bedrock data processing and CloudWatch settings.",
      trainingSummary: "AWS does not use API content for model training by default.",
      legalNotice: "Amazon Bedrock requires an active AWS account with Bedrock enabled. Model availability varies by region. Review AWS Bedrock pricing as it follows your account billing.",
    },
    aliases: ["aws", "amazon", "bedrock"],
  },
  {
    id: "azure-openai",
    label: "Azure OpenAI",
    group: "openai_compatible",
    shortDescription: "Microsoft Azure OpenAI service with enterprise compliance, data residency, and managed GPT models through your Azure subscription.",
    docsUrl: "https://learn.microsoft.com/en-us/azure/ai-services/openai/",
    apiKeyPlaceholder: "Azure API key",
    defaultBaseUrl: "https://YOUR_RESOURCE.openai.azure.com/v1",
    defaultModels: { fastModel: "gpt-5.4-nano", deepModel: "gpt-5.4" },
    modelOptions: azureModelOptions,
    capabilities: {
      ...providerDescriptors.openai_compatible.capabilities,
      supportsImageInputInBrowser: true,
      supportsCustomBaseUrl: true,
      isUserPays: true,
    },
    policy: {
      trustTier: "enterprise_ready",
      privacySummary: "Routes through your Azure subscription with Microsoft compliance and data residency controls.",
      retentionSummary: "Retention follows your Azure OpenAI resource logging and diagnostic settings.",
      trainingSummary: "Microsoft does not use customer API data to train models.",
      legalNotice: "Azure OpenAI requires an Azure subscription with OpenAI service enabled. Base URL needs your resource name. Review Azure OpenAI pricing and data privacy documentation.",
    },
    aliases: ["azure", "microsoft azure"],
  },
  {
    id: "hyperbolic",
    label: "Hyperbolic",
    group: "openai_compatible",
    shortDescription: "Privacy-first OpenAI-compatible inference with zero data retention, $1 free credits, and DeepSeek/Llama/Qwen open-source models.",
    docsUrl: "https://docs.hyperbolic.xyz/inference/overview",
    apiKeyPlaceholder: "Hyperbolic API key",
    defaultBaseUrl: "https://api.hyperbolic.xyz/v1",
    defaultModels: { fastModel: "meta-llama/Llama-3.3-70B-Instruct", deepModel: "deepseek-ai/DeepSeek-R1-0528" },
    modelOptions: hyperbolicModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: false },
    policy: {
      trustTier: "community_experimental",
      privacySummary: "Routes directly to Hyperbolic with zero data retention policy.",
      retentionSummary: "Hyperbolic advertises zero data retention for API inference traffic.",
      trainingSummary: "Hyperbolic does not train on inference data.",
      legalNotice: browserByokNotice,
    },
    aliases: ["hyperbolic"],
  },
  {
    id: "siliconflow",
    label: "SiliconFlow",
    group: "openai_compatible",
    shortDescription: "High-performance OpenAI-compatible inference with competitive pricing and a broad open-source model catalog including DeepSeek, Qwen, Llama, and Mistral.",
    docsUrl: "https://docs.siliconflow.cn/",
    apiKeyPlaceholder: "Paste SiliconFlow API key",
    defaultBaseUrl: "https://api.siliconflow.cn/v1",
    defaultModels: { fastModel: "Qwen/Qwen2.5-72B-Instruct", deepModel: "Qwen/Qwen3.5-397B-A17B" },
    modelOptions: siliconFlowModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsImageInputInBrowser: false },
    policy: {
      trustTier: "byok_recommended",
      privacySummary: "Routes directly to SiliconFlow with your key.",
      retentionSummary: "Retention follows SiliconFlow platform policy.",
      trainingSummary: "Training usage follows SiliconFlow API policy.",
      legalNotice: browserByokNotice,
    },
    aliases: ["silicon flow", "siliconflow"],
  },
  {
    id: "cloudflare-ai-gateway",
    label: "Cloudflare AI Gateway",
    group: "gateway",
    shortDescription: "Gateway preset for OpenAI-compatible traffic routed through your Cloudflare account.",
    docsUrl: "https://developers.cloudflare.com/ai-gateway/",
    apiKeyPlaceholder: "Provider or gateway token",
    defaultBaseUrl: "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT/YOUR_GATEWAY/openai",
    defaultModels: { fastModel: "gpt-4.1-mini", deepModel: "gpt-4.1" },
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsCustomBaseUrl: true, isGateway: true },
    policy: {
      trustTier: "enterprise_ready",
      privacySummary: "Routes through your Cloudflare AI Gateway and selected upstream provider.",
      retentionSummary: "Retention depends on your Cloudflare gateway and upstream settings.",
      trainingSummary: "Training usage depends on the selected upstream provider.",
      legalNotice: browserByokNotice,
    },
    aliases: ["cloudflare", "ai gateway"],
  },
  {
    id: "vercel-ai-gateway",
    label: "Vercel AI Gateway",
    group: "gateway",
    shortDescription: "Gateway preset for model routing through Vercel's AI Gateway.",
    docsUrl: "https://vercel.com/docs/ai-gateway",
    apiKeyPlaceholder: "vck_...",
    defaultBaseUrl: "https://ai-gateway.vercel.sh/v1",
    defaultModels: { fastModel: "openai/gpt-5.4-nano", deepModel: "anthropic/claude-sonnet-4.6" },
    modelOptions: vercelGatewayModelOptions,
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, isGateway: true },
    policy: {
      trustTier: "enterprise_ready",
      privacySummary: "Routes through Vercel AI Gateway and selected upstream provider.",
      retentionSummary: "Retention depends on Vercel and upstream provider policy.",
      trainingSummary: "Training usage depends on the selected upstream provider.",
      legalNotice: browserByokNotice,
    },
    aliases: ["vercel", "ai gateway", "gateway"],
  },
  {
    id: "litellm",
    label: "LiteLLM proxy",
    group: "gateway",
    shortDescription: "Self-hosted OpenAI-compatible proxy for teams that already route many providers through LiteLLM.",
    docsUrl: "https://docs.litellm.ai/docs/simple_proxy",
    apiKeyPlaceholder: "LiteLLM proxy key",
    defaultBaseUrl: "http://localhost:4000/v1",
    defaultModels: { fastModel: "gpt-4.1-mini", deepModel: "gpt-4.1" },
    capabilities: { ...providerDescriptors.openai_compatible.capabilities, supportsCustomBaseUrl: true, isGateway: true },
    policy: {
      trustTier: "enterprise_ready",
      privacySummary: "Routes to your configured LiteLLM proxy and whatever upstreams it controls.",
      retentionSummary: "Retention depends on your proxy logs and upstream providers.",
      trainingSummary: "Training usage depends on the upstream provider behind each model.",
      legalNotice: browserByokNotice,
    },
    aliases: ["proxy"],
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    group: "local",
    shortDescription: "Local OpenAI-compatible server for models running on the student's machine.",
    docsUrl: "https://lmstudio.ai/docs/app/api",
    apiKeyPlaceholder: "Usually not required locally",
    defaultBaseUrl: "http://localhost:1234/v1",
    defaultModels: { fastModel: "local-model", deepModel: "local-model" },
    capabilities: {
      ...providerDescriptors.openai_compatible.capabilities,
      requiresApiKey: false,
      supportsImageInputInBrowser: false,
      supportsCustomBaseUrl: true,
      isLocalOnly: true,
    },
    policy: {
      trustTier: "local_first",
      privacySummary: "Runs against the local LM Studio server if the browser can reach it.",
      retentionSummary: "Retention depends on local server logs and model configuration.",
      trainingSummary: "Local models do not train unless your local tooling does so.",
      legalNotice: "Local access requires LM Studio running and reachable from the browser; CORS or network settings may block it.",
    },
    aliases: ["local"],
  },
  {
    id: "ollama",
    label: "Ollama",
    group: "local",
    shortDescription: "Local-first OpenAI-compatible route for models served by Ollama on this device.",
    docsUrl: "https://github.com/ollama/ollama/blob/main/docs/openai.md",
    apiKeyPlaceholder: "No key required for local Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultModels: { fastModel: "llama3.2", deepModel: "llama3.1" },
    capabilities: {
      ...providerDescriptors.openai_compatible.capabilities,
      requiresApiKey: false,
      supportsImageInputInBrowser: false,
      supportsCustomBaseUrl: true,
      isLocalOnly: true,
    },
    policy: {
      trustTier: "local_first",
      privacySummary: "Runs against a local Ollama server when the browser can reach it.",
      retentionSummary: "Retention depends on local Ollama/server logs.",
      trainingSummary: "Local Ollama inference does not train a remote provider.",
      legalNotice: "Ollama only works when the local server is running and reachable from the browser; CORS or network permissions may require local setup.",
    },
  },
];

function cloneDefaultConfig(providerId: ProviderId): ProviderPreferenceConfig {
  const descriptor = providerDescriptors[providerId];
  const defaultPreset = openAICompatiblePresets[0];
  return {
    rememberKey: false,
    baseUrl: descriptor.defaultBaseUrl,
    models: { ...descriptor.defaultModels },
    options: providerId === "openrouter"
      ? { freeOnly: true }
      : providerId === "openai_compatible" && defaultPreset
        ? { presetId: defaultPreset.id }
        : {},
  };
}

export function createDefaultProviderPreferences(): Record<ProviderId, ProviderPreferenceConfig> {
  return Object.fromEntries(providerOrder.map((providerId) => [providerId, cloneDefaultConfig(providerId)])) as Record<
    ProviderId,
    ProviderPreferenceConfig
  >;
}

export function createDefaultProviderRuntimeConfigs(): Record<ProviderId, ProviderRuntimeConfig> {
  return Object.fromEntries(providerOrder.map((providerId) => [providerId, { ...cloneDefaultConfig(providerId) }])) as Record<
    ProviderId,
    ProviderRuntimeConfig
  >;
}

export function getProviderDescriptor(providerId: ProviderId) {
  return providerDescriptors[providerId];
}

export function getProviderLabel(providerId: ProviderId) {
  return providerDescriptors[providerId].label;
}

export function getOpenAICompatiblePreset(presetId: string | undefined) {
  return openAICompatiblePresets.find((preset) => preset.id === presetId) ?? openAICompatiblePresets[0];
}

export function getSelectedOpenAICompatiblePreset(config: ProviderPreferenceConfig) {
  return getOpenAICompatiblePreset(config.options?.presetId);
}
