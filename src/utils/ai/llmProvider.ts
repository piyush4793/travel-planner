import type { ChatMessage, LLMProviderType } from "../../types";

export type LLMConfig = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export interface LLMProvider {
  name: LLMProviderType;
  chat(messages: ChatMessage[], config?: LLMConfig): Promise<string>;
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

class OpenAIProvider implements LLMProvider {
  name: LLMProviderType = "openai";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: ChatMessage[], config?: LLMConfig): Promise<string> {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: config?.model ?? DEFAULT_MODEL,
        messages,
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) throw new Error("Invalid API key. Check your key in Settings.");
      if (res.status === 429) throw new Error("Rate limit exceeded. Wait a moment and try again.");
      if (res.status === 402 || res.status === 403)
        throw new Error("API key quota exceeded or access denied. Check your OpenAI billing.");
      throw new Error(`OpenAI error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Unexpected response from OpenAI.");
    return content;
  }
}

export function createProvider(type: LLMProviderType, apiKey: string): LLMProvider {
  switch (type) {
    case "openai":
      return new OpenAIProvider(apiKey);
    default:
      throw new Error(`Unsupported provider: ${type}`);
  }
}

/** Quick connectivity check — sends a tiny request to validate the key */
export async function validateKey(type: LLMProviderType, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const provider = createProvider(type, apiKey);
    await provider.chat(
      [{ role: "user", content: "Hi" }],
      { maxTokens: 5 },
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
