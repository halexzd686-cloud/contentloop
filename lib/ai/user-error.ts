/**
 * M4.3 — AI error sanitization boundary.
 *
 * Internal AI failures carry full technical detail (status codes,
 * provider messages, parser output) for server logs and debugging.
 * Client-facing copy is one of exactly three sanitized messages —
 * users never see AI_API_KEY, .env, HTTP codes, vendor messages,
 * SDK names, Zod paths or stack traces. HTTP response status
 * semantics are unchanged; only the message body is sanitized.
 */

export type AIUserErrorKind =
  | "unavailable" // timeout / rate-limit / provider down / empty response
  | "not_configured" // missing/invalid workspace AI configuration
  | "unusable_result"; // parse / schema-validation failure

export const AI_USER_MESSAGES: Record<AIUserErrorKind, string> = {
  unavailable:
    "AI 暂时不可用。你的手动操作流程不受影响。请重试，或先手动继续。",
  not_configured:
    "本工作区尚未配置 AI。你的手动操作流程仍可正常使用。",
  unusable_result: "AI 返回了无法使用的结果。请重试，或手动填写。",
};

/** Classify an internal AI error string into a sanitized user bucket. */
export function classifyAIError(internal: string): AIUserErrorKind {
  const s = internal.toLowerCase();
  if (s.includes("not configured") || s.includes("authentication failed"))
    return "not_configured";
  if (
    s.includes("invalid json") ||
    s.includes("failed validation") ||
    s.includes("invalid evidence") ||
    s.includes("invalid learning draft") ||
    s.includes("unusable")
  )
    return "unusable_result";
  return "unavailable";
}

/** Sanitized client-facing message for any internal AI error string. */
export function aiUserMessage(internal: string): string {
  return AI_USER_MESSAGES[classifyAIError(internal)];
}
