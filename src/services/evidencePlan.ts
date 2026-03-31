import type { EvidencePlan } from "../types";

export function formatEvidencePills(plan: EvidencePlan) {
  const pills: string[] = [];

  if (plan.needsCurrentSources) pills.push("Currentness check");
  if (plan.needsCitations) pills.push("Sources");
  if (plan.needsCalculation) pills.push("Calculation");
  if (plan.needsChart) pills.push("Chart");
  if (plan.needsFigure) pills.push("Figure");
  if (plan.needsDemo) pills.push("Demo");
  if (plan.needsWeather) pills.push("Weather");
  if (plan.needsLocalContext) pills.push("Local context");
  if (plan.needsClarification) pills.push("Clarify first");

  return pills;
}

export function describeEvidencePlan(plan: EvidencePlan) {
  if (plan.needsCurrentSources) {
    return `The answer will verify current facts against live sources${plan.exactDateContext ? ` as of ${plan.exactDateContext}` : ""}.`;
  }

  if (plan.needsCalculation) {
    return "The answer will favor tool-checked reasoning over freeform guessing.";
  }

  if (plan.needsFigure || plan.needsChart || plan.needsDemo) {
    return "The answer can include a visual explanation when it materially improves understanding.";
  }

  return "The answer will stay direct unless stronger evidence or a visual aid is needed.";
}
