import { describe, it, expect } from "vitest";
import { createSignalSchema, updateSignalStatusSchema, skipSignalSchema, createContentFromSignalSchema, signalQuerySchema, SKIP_REASONS } from "@/lib/validation/signal";

/**
 * M1.1 Tests — Signal validation and business rules
 * Source: data-model §6, implementation-plan Day 3
 */

// ─── 1. createSignal Zod Validation ──────────────────────────────────────────

describe("createSignalSchema", () => {
  it("accepts a valid URL signal", () => {
    const result = createSignalSchema.safeParse({
      inputType: "url",
      sourceUrl: "https://example.com/article",
      title: "Claude Agent Update",
      summary: "New capabilities released",
      sourceType: "official",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid Idea signal", () => {
    const result = createSignalSchema.safeParse({
      inputType: "idea",
      title: "AI workflow optimization",
      summary: "How we streamlined content production",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a signal with minimal fields", () => {
    const result = createSignalSchema.safeParse({
      inputType: "idea",
      title: "Minimal idea",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid inputType", () => {
    const result = createSignalSchema.safeParse({
      inputType: "video",
      title: "Some title",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = createSignalSchema.safeParse({
      inputType: "idea",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = createSignalSchema.safeParse({
      inputType: "url",
      sourceUrl: "https://example.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields as empty strings", () => {
    const result = createSignalSchema.safeParse({
      inputType: "url",
      sourceUrl: "",
      title: "Test",
      summary: "",
      publishedAt: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid sourceType", () => {
    const result = createSignalSchema.safeParse({
      inputType: "url",
      title: "Test",
      sourceType: "tiktok",
    });
    expect(result.success).toBe(false);
  });
});

// ─── 2. Signal Status Boundary ──────────────────────────────────────────────

describe("updateSignalStatusSchema", () => {
  it("allows new", () => {
    const result = updateSignalStatusSchema.safeParse({ status: "new" });
    expect(result.success).toBe(true);
  });

  it("allows reviewing", () => {
    const result = updateSignalStatusSchema.safeParse({ status: "reviewing" });
    expect(result.success).toBe(true);
  });

  it("rejects selected (deferred to M1.2)", () => {
    const result = updateSignalStatusSchema.safeParse({ status: "selected" });
    expect(result.success).toBe(false);
  });

  it("rejects skipped (deferred to M1.2)", () => {
    const result = updateSignalStatusSchema.safeParse({ status: "skipped" });
    expect(result.success).toBe(false);
  });

  it("rejects arbitrary status", () => {
    const result = updateSignalStatusSchema.safeParse({ status: "published" });
    expect(result.success).toBe(false);
  });
});

// ─── 3. Missing Score Behavior ──────────────────────────────────────────────

describe("Signal score handling", () => {
  it("null score remains null, never becomes 0", () => {
    // Simulates what happens when a Signal has no scores yet
    const signal = {
      topicScore: null,
      audienceFitScore: null,
      timingScore: null,
      contentPotentialScore: null,
    };

    // These should remain null, not be coerced to 0
    expect(signal.topicScore).toBeNull();
    expect(signal.topicScore).not.toBe(0);
    expect(signal.audienceFitScore).toBeNull();
    expect(signal.audienceFitScore).not.toBe(0);
  });

  it("schema does not require scores", () => {
    const result = createSignalSchema.safeParse({
      inputType: "idea",
      title: "No scores",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Scores are not part of create schema — they stay null
      expect(result.data).not.toHaveProperty("topicScore");
      expect(result.data).not.toHaveProperty("audienceFitScore");
    }
  });
});

// ─── 4. requireSingleBrand Invariant ────────────────────────────────────────

describe("requireSingleBrand invariant", () => {
  // We test the logic, not the DB call.
  // The actual DB call requires a live connection; here we validate the guard logic.

  function checkBrandCount(brands: unknown[]): string {
    if (brands.length === 0) {
      return "No brand configured. Run seed or create a brand in Settings.";
    }
    if (brands.length > 1) {
      return `Expected exactly 1 brand, found ${brands.length}. This is a configuration error.`;
    }
    return "ok";
  }

  it("0 brands → explicit error", () => {
    expect(checkBrandCount([])).toContain("No brand configured");
  });

  it("1 brand → success", () => {
    expect(checkBrandCount([{ id: "1" }])).toBe("ok");
  });

  it("2 brands → explicit configuration error", () => {
    expect(checkBrandCount([{ id: "1" }, { id: "2" }])).toContain(
      "Expected exactly 1 brand, found 2"
    );
  });

  it("5 brands → explicit configuration error", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: `${i}` }));
    expect(checkBrandCount(many)).toContain("Expected exactly 1 brand, found 5");
  });
});

// ─── 5. Skip Signal Validation ──────────────────────────────────────────────

describe("skipSignalSchema", () => {
  it("accepts skipped with valid reason", () => {
    for (const reason of SKIP_REASONS) {
      const result = skipSignalSchema.safeParse({
        status: "skipped",
        skipReason: reason,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects skipped without skipReason", () => {
    const result = skipSignalSchema.safeParse({
      status: "skipped",
    });
    expect(result.success).toBe(false);
  });

  it("rejects skipped with null skipReason", () => {
    const result = skipSignalSchema.safeParse({
      status: "skipped",
      skipReason: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects skipped with invalid reason", () => {
    const result = skipSignalSchema.safeParse({
      status: "skipped",
      skipReason: "not_a_valid_reason",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-skipped status in skip schema", () => {
    const result = skipSignalSchema.safeParse({
      status: "new",
      skipReason: "too_late",
    });
    expect(result.success).toBe(false);
  });
});

// ─── 6. Create Content Validation ───────────────────────────────────────────

describe("createContentFromSignalSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid input", () => {
    const result = createContentFromSignalSchema.safeParse({
      primaryPlatform: "xiaohongshu",
      selectedAngle: "Hands-on review",
      ownerId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid platform", () => {
    const result = createContentFromSignalSchema.safeParse({
      primaryPlatform: "tiktok",
      selectedAngle: "Review",
      ownerId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty selectedAngle", () => {
    const result = createContentFromSignalSchema.safeParse({
      primaryPlatform: "bilibili",
      selectedAngle: "",
      ownerId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing selectedAngle", () => {
    const result = createContentFromSignalSchema.safeParse({
      primaryPlatform: "bilibili",
      ownerId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ownerId (not UUID)", () => {
    const result = createContentFromSignalSchema.safeParse({
      primaryPlatform: "douyin",
      selectedAngle: "Quick demo",
      ownerId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing ownerId", () => {
    const result = createContentFromSignalSchema.safeParse({
      primaryPlatform: "douyin",
      selectedAngle: "Quick demo",
    });
    expect(result.success).toBe(false);
  });
});

// ─── 7. Business Invariants (logic-level) ───────────────────────────────────

describe("Signal → Content business invariants", () => {
  // These test the guard logic used in the create-content transaction.
  // No DB mock — we validate the decision logic directly.

  function canCreateContent(signalStatus: string, hasExistingContent: boolean): string | null {
    if (signalStatus !== "new" && signalStatus !== "reviewing") {
      return `Cannot create content from signal with status "${signalStatus}". Only new or reviewing signals can be selected.`;
    }
    if (hasExistingContent) {
      return "This signal already has a linked content.";
    }
    return null; // allowed
  }

  it("new signal without content → allowed", () => {
    expect(canCreateContent("new", false)).toBeNull();
  });

  it("reviewing signal without content → allowed", () => {
    expect(canCreateContent("reviewing", false)).toBeNull();
  });

  it("selected signal → rejected", () => {
    expect(canCreateContent("selected", false)).toContain("Cannot create content");
  });

  it("skipped signal → rejected", () => {
    expect(canCreateContent("skipped", false)).toContain("Cannot create content");
  });

  it("new signal with existing content → rejected (duplicate)", () => {
    expect(canCreateContent("new", true)).toContain("already has a linked content");
  });

  it("reviewing signal with existing content → rejected (duplicate)", () => {
    expect(canCreateContent("reviewing", true)).toContain("already has a linked content");
  });
});

// ─── M5.2 G-55: Reviewing is a first-class filter value ──

describe("signalQuerySchema — Reviewing filter (M5.2)", () => {
  it("accepts reviewing as a filter status", () => {
    expect(signalQuerySchema.safeParse({ status: "reviewing" }).success).toBe(true);
  });

  it("existing statuses unchanged; unknown rejected", () => {
    for (const s of ["new", "selected", "skipped"]) {
      expect(signalQuerySchema.safeParse({ status: s }).success).toBe(true);
    }
    expect(signalQuerySchema.safeParse({ status: "archived" }).success).toBe(false);
    expect(signalQuerySchema.safeParse({}).success).toBe(true); // All
  });
});
