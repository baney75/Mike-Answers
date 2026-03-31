import type { EvidencePlan, ToolIntent } from "../types";

const CURRENT_HINT =
  /\b(current|currently|today|latest|recent|right now|breaking|this week|weather|forecast|temperature|stock|election|officeholder|president|ceo|governor|mayor|local|near me)\b/i;
const RESEARCH_HINT =
  /\b(research|study|studies|paper|papers|journal|journals|citation|citations|sources|evidence|compare views|summarize the literature|meta-analysis)\b/i;
const CALC_HINT =
  /\b(calculate|solve|equation|formula|integral|derivative|probability|statistics|regression|simulate|model|optimi[sz]e|trajectory)\b/i;
const FIGURE_HINT =
  /\b(diagram|figure|timeline|compare|comparison|concept map|flow chart|process|visualize|visualise|show the structure)\b/i;
const CHART_HINT =
  /\b(graph|plot|chart|trend|scatter|histogram|distribution|series|visualization|visualisation)\b/i;
const IMAGE_HINT =
  /\b(image|photo|screenshot|picture|see this|what is in this)\b/i;
const WORLDVIEW_HINT =
  /\b(abortion|euthanasia|evil|morality|objective truth|is .* wrong|worldview|meaning of life|god|christian|bible|church|sin|marriage)\b/i;
const SCRIPTURE_HINT = /\b(scripture|bible|biblical|gospel|jesus|paul|genesis|romans|proverbs)\b/i;
const WEATHER_HINT = /\b(weather|forecast|temperature|rain|snow|humidity|wind|storm|radar)\b/i;
const LOCAL_HINT = /\b(local|near me|nearby|around here|my area|this city|where i am)\b/i;
const CLARIFY_HINT = /\b(this|that|it|thing|stuff)\b/i;

export function classifyRequest(text: string): ToolIntent[] {
  const intents = new Set<ToolIntent>();
  const normalized = text.trim();

  if (!normalized) {
    return ["direct_tutor"];
  }

  intents.add("direct_tutor");

  if (CURRENT_HINT.test(normalized)) intents.add("current_fact");
  if (RESEARCH_HINT.test(normalized)) intents.add("research");
  if (CALC_HINT.test(normalized)) intents.add("calculation");
  if (FIGURE_HINT.test(normalized)) intents.add("figure");
  if (CHART_HINT.test(normalized)) intents.add("chart");
  if (IMAGE_HINT.test(normalized)) intents.add("image_analysis");
  if (WEATHER_HINT.test(normalized)) intents.add("weather");
  if (LOCAL_HINT.test(normalized)) intents.add("local_context");
  if (WORLDVIEW_HINT.test(normalized)) intents.add("worldview");
  if (SCRIPTURE_HINT.test(normalized)) intents.add("theology");
  if (/\b(simulation|simulate|demo|animate|show me how it moves)\b/i.test(normalized)) {
    intents.add("simulation");
  }

  return [...intents];
}

export function buildEvidencePlan(text: string): EvidencePlan {
  const intents = classifyRequest(text);
  const needsCurrentSources = intents.includes("current_fact") || intents.includes("weather");
  const needsCitations = needsCurrentSources || intents.includes("research") || intents.includes("worldview");
  const needsCalculation = intents.includes("calculation");
  const needsWeather = intents.includes("weather");
  const needsLocalContext = intents.includes("local_context") || intents.includes("weather");
  const needsChart = intents.includes("chart") || /\b(plot|graph|trend|distribution)\b/i.test(text);
  const needsFigure = intents.includes("figure");
  const needsDemo = intents.includes("simulation");
  const needsClarification =
    text.trim().length < 18 && CLARIFY_HINT.test(text) && !needsCurrentSources && !needsCalculation;

  return {
    intents,
    needsCurrentSources,
    needsCitations,
    needsClarification,
    needsCalculation,
    needsWeather,
    needsLocalContext,
    needsChart,
    needsFigure,
    needsDemo,
    exactDateContext: needsCurrentSources ? new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) : undefined,
  };
}
