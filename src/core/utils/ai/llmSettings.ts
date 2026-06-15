import { loadLS, saveLS } from "../../storage";
import { LS_KEYS } from "../../lsKeys";
import type { LLMProviderType, LLMKeys } from "../../types";

export function getLLMKeys(): LLMKeys {
  return loadLS<LLMKeys>(LS_KEYS.LLM_KEYS, {});
}

export function getActiveProvider(): LLMProviderType {
  return loadLS<LLMProviderType>(LS_KEYS.LLM_PROVIDER, "openai");
}

/**
 * Persists LLM API keys to localStorage.
 * WARNING: Keys are stored in plaintext — recommend users set billing limits on their provider accounts.
 */
export function saveLLMKeys(keys: LLMKeys): void {
  saveLS(LS_KEYS.LLM_KEYS, keys);
}

export function saveActiveProvider(p: LLMProviderType): void {
  saveLS(LS_KEYS.LLM_PROVIDER, p);
}
