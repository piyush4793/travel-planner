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

/* ── OpenAI ──────────────────────────────────────────────────────────────────── */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

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
        model: config?.model ?? DEFAULT_OPENAI_MODEL,
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

/* ── Claude (Anthropic) ──────────────────────────────────────────────────────── */

const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_VERSION = "2023-06-01";

class ClaudeProvider implements LLMProvider {
  name: LLMProviderType = "claude";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: ChatMessage[], config?: LLMConfig): Promise<string> {
    // Claude uses system as a top-level field, not as a message role
    const systemParts: string[] = [];
    const apiMessages: { role: "user" | "assistant"; content: string }[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemParts.push(msg.content);
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const res = await fetch(CLAUDE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: config?.model ?? DEFAULT_CLAUDE_MODEL,
        system: systemParts.join("\n\n") || undefined,
        messages: apiMessages,
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) throw new Error("Invalid API key. Check your Claude key in Settings.");
      if (res.status === 429) throw new Error("Rate limit exceeded. Wait a moment and try again.");
      if (res.status === 403)
        throw new Error("Access denied. Ensure your Anthropic key has browser access enabled.");
      throw new Error(`Claude error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const textBlock = json.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text || typeof textBlock.text !== "string")
      throw new Error("Unexpected response from Claude.");
    return textBlock.text;
  }
}

/* ── Gemini (Google) ──────────────────────────────────────────────────────────── */

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

class GeminiProvider implements LLMProvider {
  name: LLMProviderType = "gemini";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: ChatMessage[], config?: LLMConfig): Promise<string> {
    const model = config?.model ?? DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    // Gemini uses systemInstruction + contents with user/model roles
    const systemParts: string[] = [];
    const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemParts.push(msg.content);
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
        maxOutputTokens: config?.maxTokens ?? 2048,
      },
    };
    if (systemParts.length) {
      body.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      if (res.status === 400 && errBody.includes("API_KEY_INVALID"))
        throw new Error("Invalid API key. Check your Gemini key in Settings.");
      if (res.status === 429) throw new Error("Rate limit exceeded. Wait a moment and try again.");
      if (res.status === 403)
        throw new Error("Access denied. Ensure the Generative Language API is enabled for your key.");
      throw new Error(`Gemini error ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new Error("Unexpected response from Gemini.");
    return text;
  }
}

/* ── Factory ─────────────────────────────────────────────────────────────────── */

export function createProvider(type: LLMProviderType, apiKey: string): LLMProvider {
  switch (type) {
    case "openai":
      return new OpenAIProvider(apiKey);
    case "claude":
      return new ClaudeProvider(apiKey);
    case "gemini":
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unsupported provider: ${type}`);
  }
}

export const PROVIDER_LABELS: Record<LLMProviderType, string> = {
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Gemini",
};

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
