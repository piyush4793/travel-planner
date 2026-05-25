import type { ChatMessage, LLMProviderType, LLMChatResult, TokenUsage } from "../../types";

export type LLMConfig = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export interface LLMProvider {
  name: LLMProviderType;
  chat(messages: ChatMessage[], config?: LLMConfig): Promise<LLMChatResult>;
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

  async chat(messages: ChatMessage[], config?: LLMConfig): Promise<LLMChatResult> {
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
        max_tokens: config?.maxTokens ?? 16384,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) throw new Error("Invalid API key. Check your key in Settings.");
      if (res.status === 429) {
        if (body.includes("insufficient_quota"))
          throw new Error("OpenAI quota exceeded. Check your billing at platform.openai.com/account/billing.");
        throw new Error("Rate limit exceeded. Wait a moment and try again.");
      }
      if (res.status === 402 || res.status === 403)
        throw new Error("API key quota exceeded or access denied. Check your OpenAI billing at platform.openai.com/account/billing.");
      throw new Error(`OpenAI error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Unexpected response from OpenAI.");

    const usage = parseUsage(json.usage?.prompt_tokens, json.usage?.completion_tokens);
    return { content, usage };
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

  async chat(messages: ChatMessage[], config?: LLMConfig): Promise<LLMChatResult> {
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
        max_tokens: config?.maxTokens ?? 16384,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) throw new Error("Invalid API key. Check your Claude key in Settings.");
      if (res.status === 429) {
        if (body.includes("credit") || body.includes("billing"))
          throw new Error("Claude credit exhausted. Add billing at console.anthropic.com.");
        throw new Error("Rate limit exceeded. Wait a moment and try again.");
      }
      if (res.status === 403)
        throw new Error("Access denied. Ensure your Anthropic key has browser access enabled.");
      throw new Error(`Claude error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const textBlock = json.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text || typeof textBlock.text !== "string")
      throw new Error("Unexpected response from Claude.");

    const usage = parseUsage(json.usage?.input_tokens, json.usage?.output_tokens);
    return { content: textBlock.text, usage };
  }
}

/* ── Gemini (Google) ──────────────────────────────────────────────────────────── */

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

class GeminiProvider implements LLMProvider {
  name: LLMProviderType = "gemini";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: ChatMessage[], config?: LLMConfig): Promise<LLMChatResult> {
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
        maxOutputTokens: config?.maxTokens ?? 16384,
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
      if (res.status === 429) throw new Error("Gemini rate limit exceeded. Wait a moment and try again. Free tier: 15 requests/min.");
      if (res.status === 403)
        throw new Error("Access denied. Ensure the Generative Language API is enabled for your Google Cloud project.");
      throw new Error(`Gemini error ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new Error("Unexpected response from Gemini.");

    const meta = json.usageMetadata;
    const usage = parseUsage(meta?.promptTokenCount, meta?.candidatesTokenCount);
    return { content: text, usage };
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────────── */

function parseUsage(input?: number, output?: number): TokenUsage | undefined {
  if (typeof input !== "number" || typeof output !== "number") return undefined;
  return { inputTokens: input, outputTokens: output, totalTokens: input + output };
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

/** Per-1M-token pricing (USD) — approximate, for cost estimation only */
export const PROVIDER_PRICING: Record<LLMProviderType, { model: string; inputPer1M: number; outputPer1M: number }> = {
  openai:  { model: "GPT-4o mini",         inputPer1M: 0.15,  outputPer1M: 0.60 },
  claude:  { model: "Claude 3.5 Haiku",    inputPer1M: 0.80,  outputPer1M: 4.00 },
  gemini:  { model: "Gemini 2.0 Flash",    inputPer1M: 0.10,  outputPer1M: 0.40 },
};

/** Estimate cost in USD from token counts */
export function estimateCost(provider: LLMProviderType, inputTokens: number, outputTokens: number): number {
  const p = PROVIDER_PRICING[provider];
  return (inputTokens / 1_000_000) * p.inputPer1M + (outputTokens / 1_000_000) * p.outputPer1M;
}

/** Format cost as human-readable string */
export function formatCost(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  if (usd < 0.01) return `~$${usd.toFixed(3)}`;
  return `~$${usd.toFixed(2)}`;
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
    if (e instanceof TypeError && e.message === "Failed to fetch") {
      return { ok: false, error: `Network error — ${PROVIDER_LABELS[type]} may not be reachable from this browser. Check your internet connection or try again.` };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
