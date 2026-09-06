import { describe, it, expect } from "vitest";

import {
  classifyAIError,
  aiUserMessage,
  AI_USER_MESSAGES,
} from "@/lib/ai/user-error";
import { AIProviderError } from "@/lib/ai/provider";

/**
 * M4.3 — AI error sanitization. Client-visible copy must be one of
 * three sanitized messages; internal diagnostics (status codes,
 * provider detail, config cause) remain available server-side via
 * AIProviderError.kind/message and console logging.
 */

const FORBIDDEN_IN_USER_COPY = [
  "AI_API_KEY",
  ".env",
  "429",
  "502",
  "DeepSeek",
  "OpenAI",
  "Zod",
  "stack",
];

describe("classifyAIError", () => {
  it("availability / timeout / rate-limit → unavailable", () => {
    expect(classifyAIError("AI provider request timed out.")).toBe("unavailable");
    expect(classifyAIError("AI provider rate limited (429).")).toBe("unavailable");
    expect(classifyAIError("AI provider error (502).")).toBe("unavailable");
    expect(classifyAIError("AI provider returned an empty response.")).toBe("unavailable");
    expect(classifyAIError("socket hang up")).toBe("unavailable"); // unknown default
  });

  it("configuration / auth → not_configured", () => {
    expect(
      classifyAIError("AI_API_KEY is not configured (workspace AI configuration missing).")
    ).toBe("not_configured");
    expect(classifyAIError("AI provider authentication failed (key rejected).")).toBe(
      "not_configured"
    );
  });

  it("parse / validation → unusable_result", () => {
    expect(classifyAIError("AI returned invalid JSON")).toBe("unusable_result");
    expect(
      classifyAIError("AI output failed validation: possibleReasons.0: String must contain…")
    ).toBe("unusable_result");
    expect(classifyAIError("Invalid evidence references: x")).toBe("unusable_result");
    expect(classifyAIError("AI returned an invalid learning draft.")).toBe("unusable_result");
  });
});

describe("aiUserMessage", () => {
  it("maps every bucket to its mandated copy", () => {
    expect(aiUserMessage("AI provider request timed out.")).toBe(
      "AI is temporarily unavailable. Your manual workflow is unaffected. Retry, or continue by hand."
    );
    expect(aiUserMessage("AI_API_KEY is not configured (workspace AI configuration missing).")).toBe(
      "AI is not configured for this workspace. Your manual workflow is still available."
    );
    expect(aiUserMessage("AI returned invalid JSON")).toBe(
      "AI returned an unusable result. Retry, or continue manually."
    );
  });

  it("sanitized copy never contains technical identifiers", () => {
    const samples = [
      "AI provider rate limited (429).",
      "AI provider error (502).",
      "AI provider error: DeepSeek vendor says quota exceeded",
      "AI_API_KEY is not configured (workspace AI configuration missing).",
      "AI output failed validation: evidenceRefs.0.metricKey: String must…",
      "AI provider request timed out.",
      "some unknown SDK stack trace",
    ];
    for (const s of samples) {
      const msg = aiUserMessage(s);
      for (const bad of FORBIDDEN_IN_USER_COPY) {
        expect(msg).not.toContain(bad);
      }
      expect(Object.values(AI_USER_MESSAGES)).toContain(msg);
    }
  });
});

describe("internal diagnostics preservation", () => {
  it("AIProviderError keeps kind + technical message for server logs", () => {
    const err = new AIProviderError("rate_limited", "AI provider rate limited (429).");
    expect(err.kind).toBe("rate_limited");
    expect(err.message).toContain("429"); // internal only — never sent to client
    expect(err).toBeInstanceOf(Error);
  });

  it("not_configured is a distinct internal kind", () => {
    const err = new AIProviderError(
      "not_configured",
      "AI_API_KEY is not configured (workspace AI configuration missing)."
    );
    expect(err.kind).toBe("not_configured");
  });
});
