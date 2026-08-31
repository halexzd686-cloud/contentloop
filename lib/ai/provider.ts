import OpenAI from "openai";

/**
 * AI Provider abstraction — implementation-plan §AI Layer.
 *
 * V1 uses a single provider: DeepSeek official API (OpenAI-compatible).
 * Business code must depend only on the AIProvider interface below,
 * never on the vendor SDK directly.
 *
 * Not in V1: multi-model router, fallback providers, model selector UI,
 * runtime provider switching.
 */

export type AIErrorKind =
  | "unavailable" // network error / 5xx / provider down
  | "timeout"
  | "rate_limited" // 429
  | "empty_response"; // provider returned no content

export class AIProviderError extends Error {
  readonly kind: AIErrorKind;

  constructor(kind: AIErrorKind, message: string) {
    super(message);
    this.name = "AIProviderError";
    this.kind = kind;
  }
}

export interface GenerateStructuredParams {
  system: string;
  user: string;
}

/**
 * Returns the raw response content (expected to be a JSON string).
 * Parsing and Zod validation are the caller's responsibility.
 */
export interface AIProvider {
  generateStructured(params: GenerateStructuredParams): Promise<string>;
}

const REQUEST_TIMEOUT_MS = 30_000;

export function createDeepSeekProvider(): AIProvider {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new AIProviderError(
      "unavailable",
      "AI_API_KEY is not configured. Add it to .env (see .env.example)."
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL || "https://api.deepseek.com",
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0, // retry budget is owned by analyze-signal (max 2 requests per click)
  });

  const model = process.env.AI_MODEL || "deepseek-v4-flash";

  return {
    async generateStructured({ system, user }) {
      let response;
      try {
        response = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });
      } catch (err) {
        if (err instanceof OpenAI.APIError) {
          if (err.status === 429) {
            throw new AIProviderError("rate_limited", "AI provider rate limited (429).");
          }
          if (err.status === 401 || err.status === 403) {
            // Do not pass through vendor auth errors — they may contain key fragments.
            throw new AIProviderError(
              "unavailable",
              "AI provider authentication failed. Check AI_API_KEY."
            );
          }
          if (err.name === "APIConnectionTimeoutError" || err.code === "ETIMEDOUT") {
            throw new AIProviderError("timeout", "AI provider request timed out.");
          }
          if (err.status && err.status >= 500) {
            throw new AIProviderError("unavailable", `AI provider error (${err.status}).`);
          }
          throw new AIProviderError("unavailable", `AI provider error: ${err.message}`);
        }
        if (err instanceof Error && err.name === "APIConnectionTimeoutError") {
          throw new AIProviderError("timeout", "AI provider request timed out.");
        }
        throw new AIProviderError(
          "unavailable",
          err instanceof Error ? err.message : "AI provider unavailable."
        );
      }

      const content = response.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        throw new AIProviderError("empty_response", "AI provider returned an empty response.");
      }
      return content;
    },
  };
}
