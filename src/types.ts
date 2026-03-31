/** Possible states for the main application flow. */
export type AppState = 'IDLE' | 'PREVIEWING' | 'LOADING' | 'SOLVED' | 'ERROR' | 'NEWS' | 'WOTD';

/** Which Gemini model tier to use when solving a question. */
export type SolveMode = 'deep' | 'fast' | 'research';

/** Supported inference providers. */
export type ProviderId = 'gemini' | 'openrouter' | 'minimax' | 'custom_openai';

/** Families of provider integrations. */
export type ProviderKind = 'gemini_native' | 'openai_compatible';

export interface ProviderModelProfile {
  fastModel?: string;
  deepModel?: string;
  groundedModel?: string;
  imageModel?: string;
  transcriptionModel?: string;
}

export interface ProviderOptions {
  freeOnly?: boolean;
  useSecureBackendForAdvanced?: boolean;
  customLabel?: string;
}

export interface ProviderPreferenceConfig {
  rememberKey?: boolean;
  baseUrl?: string;
  models: ProviderModelProfile;
  options?: ProviderOptions;
}

export interface ProviderRuntimeConfig extends ProviderPreferenceConfig {
  apiKey?: string;
}

export interface ProviderCapabilities {
  supportsGrounding: boolean;
  supportsImageInputInBrowser: boolean;
  supportsAudioTranscription: boolean;
  supportsSecureAdvanced: boolean;
  supportsCustomBaseUrl: boolean;
  supportsModelCatalog: boolean;
}

export interface ProviderDescriptor {
  id: ProviderId;
  kind: ProviderKind;
  label: string;
  shortDescription: string;
  docsUrl: string;
  apiKeyPlaceholder: string;
  defaultBaseUrl?: string;
  defaultModels: ProviderModelProfile;
  capabilities: ProviderCapabilities;
}

/** A grounded source rendered in the app's custom source UI. */
export interface SolutionSource {
  index: number;
  title: string;
  url: string;
  host: string;
  category: string;
}

/** A single message in the follow-up chat with the AI tutor. */
export interface ChatMessage {
  role: 'user' | 'tutor';
  text: string;
}

/** A previously-solved question stored in localStorage history. */
export interface HistoryItem {
  id: string;
  timestamp: number;
  solution: string;
  type?: 'solve' | 'grade';
  hideAnswerByDefault?: boolean;
  requestText?: string;
  subject?: string;
  mode?: Exclude<SolveMode, 'research'>;
  provider?: ProviderId;
  model?: string;
}

/** Context passed to AI for feature views (WOTD, News). */
export interface FeatureContext {
  type: 'wotd' | 'news';
  data: {
    word?: string;
    definition?: string;
    example?: string;
    phonetic?: string;
    partOfSpeech?: string;
    date?: string;
    articles?: Array<{
      title: string;
      link: string;
      description: string;
      source: string;
      pubDate: string;
    }>;
  };
}

/** Actions the AI can request from the UI. */
export interface AIAction {
  type: 'show_wotd' | 'show_news' | 'ask_question';
  payload?: Record<string, unknown>;
}

/** Background task that survives navigation */
export interface BackgroundTask {
  id: string;
  type: 'solve';
  status: 'running' | 'completed' | 'failed';
  solution?: string;
  hideAnswerByDefault?: boolean;
  error?: string;
  timestamp: number;
  mode: Exclude<SolveMode, 'research'>;
  input: {
    imageFile?: File;
    textInput?: string;
    subject: string;
  };
}

/** Saved state to return to after viewing features */
export interface SavedState {
  solution: string;
  hideAnswerByDefault?: boolean;
  chatHistory: ChatMessage[];
  mode: Exclude<SolveMode, 'research'>;
  subject: string;
  input: {
    imageFile?: File;
    textInput?: string;
  };
}

export interface OpenRouterModelSummary {
  id: string;
  name: string;
  description?: string;
  contextLength: number;
  inputModalities: string[];
  supportsImages: boolean;
  free: boolean;
}

export interface UserPreferencesSnapshot {
  selectedProviderId: ProviderId;
  preferredSubject?: string;
  preferredLocation?: string;
  onboardingCompleted?: boolean;
  providers: Record<ProviderId, ProviderPreferenceConfig>;
  updatedAt?: number;
}

export interface RuntimeAISettings extends UserPreferencesSnapshot {
  providers: Record<ProviderId, ProviderRuntimeConfig>;
}

export interface AuthWorkspaceState {
  enabled: boolean;
  signedIn: boolean;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  syncReady?: boolean;
}

export interface HistoryController {
  items: HistoryItem[];
  push: (item: HistoryItem) => void | Promise<void>;
  clear: () => void | Promise<void>;
  label?: string;
}

export interface SecureProviderKeyStatus {
  gemini: boolean;
  openrouter: boolean;
  minimax: boolean;
  custom_openai: boolean;
}

export interface SecureBackendController {
  enabled: boolean;
  keyStatus: SecureProviderKeyStatus;
  storeProviderKey: (provider: ProviderId, apiKey: string) => Promise<void>;
  removeProviderKey: (provider: ProviderId) => Promise<void>;
  solveText: (args: {
    provider: ProviderId;
    text: string;
    mode: Exclude<SolveMode, 'research'>;
    subject: string;
    detailed: boolean;
    settings: RuntimeAISettings;
  }) => Promise<{ text: string; provider: ProviderId; model?: string }>;
  solveImage: (args: {
    provider: ProviderId;
    base64Image: string;
    mode: Exclude<SolveMode, 'research'>;
    subject: string;
    detailed: boolean;
    settings: RuntimeAISettings;
  }) => Promise<{ text: string; provider: ProviderId; model?: string }>;
  chat: (args: {
    provider: ProviderId;
    history: { role: string; text: string }[];
    message: string;
    originalQuestion?: { text?: string; imageBase64?: string };
    settings: RuntimeAISettings;
  }) => Promise<string>;
  transcribeAudio?: (args: {
    provider: ProviderId;
    audioBase64: string;
    mimeType: string;
    settings: RuntimeAISettings;
  }) => Promise<string>;
}

export type ToolIntent =
  | "direct_tutor"
  | "current_fact"
  | "research"
  | "calculation"
  | "chart"
  | "figure"
  | "image_analysis"
  | "local_context"
  | "weather"
  | "worldview"
  | "theology"
  | "simulation";

export interface EvidencePlan {
  intents: ToolIntent[];
  needsCurrentSources: boolean;
  needsCitations: boolean;
  needsClarification: boolean;
  needsCalculation: boolean;
  needsWeather: boolean;
  needsLocalContext: boolean;
  needsChart: boolean;
  needsFigure: boolean;
  needsDemo: boolean;
  exactDateContext?: string;
}

export interface CitationCard {
  title: string;
  url: string;
  host: string;
  type: "primary" | "official" | "scholarly" | "news" | "commentary";
  note?: string;
}

export interface FigureSpec {
  type: "timeline" | "comparison" | "process" | "geometry" | "concept_map";
  title?: string;
  caption?: string;
  items?: Array<{ label: string; detail?: string; accent?: string }>;
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: string[];
  rightItems?: string[];
  steps?: Array<{ title: string; detail?: string }>;
}

export interface DemoSpec {
  type: "kinematics" | "pendulum" | "function_transform" | "distribution";
  title?: string;
  caption?: string;
  params?: Record<string, number>;
  note?: string;
}

export interface StatSpec {
  title?: string;
  caption?: string;
  items: Array<{
    label: string;
    value: string | number;
    change?: string;
    detail?: string;
  }>;
}

export interface BrandAssetManifestEntry {
  png: string;
  webp: string;
}

export interface BrandAssetManifest {
  emblem: BrandAssetManifestEntry;
  icon: {
    app192: string;
    app512: string;
    maskable512: string;
    favicon16: string;
    favicon32: string;
  };
  heroes: Record<string, BrandAssetManifestEntry>;
}

export interface VaultStatus {
  enabled: boolean;
  trustedDevices: number;
  recoveryReady: boolean;
}

export interface TrustedDeviceSummary {
  id: string;
  name: string;
  addedAt: number;
  lastSeenAt?: number;
  current?: boolean;
}

export interface UserMemoryItem {
  id: string;
  title: string;
  body: string;
  category: "goal" | "style" | "location" | "subject" | "other";
  updatedAt: number;
}

export interface LocalContextState {
  preferredPlace?: string;
  preciseLocationEnabled?: boolean;
}

export interface PwaInstallState {
  available: boolean;
  installed: boolean;
}
