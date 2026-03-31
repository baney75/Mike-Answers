import { mikeAssetManifest, type MikeAssetSubject } from "../assets/mike/manifest";

const SUBJECT_MAP: Record<string, MikeAssetSubject> = {
  "auto-detect": "general",
  mathematics: "mathematics",
  physics: "physics",
  chemistry: "chemistry",
  history: "history",
  philosophy: "philosophy",
};

export function getMikeHeroAsset(subject: string) {
  const key = SUBJECT_MAP[subject.toLowerCase()] ?? "general";
  return mikeAssetManifest.heroes[key];
}

export function getMikeEmblemAsset() {
  return mikeAssetManifest.emblem;
}

export function getMikeIconAsset() {
  return mikeAssetManifest.icon;
}
