/**
 * Free dictionary lookups via https://dictionaryapi.dev — no API key needed.
 */

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string; synonyms?: string[] }[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings: DictionaryMeaning[];
  sourceUrls?: string[];
}

const BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

import { fetchJson } from "../utils/fetch";

export async function lookupWord(word: string): Promise<DictionaryEntry[]> {
  try {
    return await fetchJson<DictionaryEntry[]>(`${BASE}/${encodeURIComponent(word.trim())}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("404") || message.includes("failed (404")) {
      throw new Error(`No definition found for "${word}".`);
    }
    throw new Error("Dictionary lookup failed. Please try again.");
  }
}
