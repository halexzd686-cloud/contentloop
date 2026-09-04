import { describe, it, expect } from "vitest";

import {
  manualCreateSchema,
  setPrimaryPlatformSchema,
} from "@/lib/validation/content";

/**
 * M4.1 — Data Trust & Correction Core tests.
 *
 * DB-level behavior (baseline demo exclusion, backfill, discard
 * transaction, archive eligibility, matcher migration) is verified by
 * the Supabase smoke; these cover the strict server-authority schemas.
 */

const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("manualCreateSchema", () => {
  it("accepts the minimal human fields", () => {
    const r = manualCreateSchema.safeParse({
      title: "New content",
      primaryPlatform: "xiaohongshu",
      ownerId: VALID_UUID,
    });
    expect(r.success).toBe(true);
  });

  it("accepts optional pillarId (uuid or null)", () => {
    expect(
      manualCreateSchema.safeParse({
        title: "t",
        primaryPlatform: "bilibili",
        ownerId: VALID_UUID,
        pillarId: VALID_UUID,
      }).success
    ).toBe(true);
    expect(
      manualCreateSchema.safeParse({
        title: "t",
        primaryPlatform: "bilibili",
        ownerId: VALID_UUID,
        pillarId: null,
      }).success
    ).toBe(true);
  });

  it("requires primaryPlatform — manual content can never be platform-less", () => {
    const r = manualCreateSchema.safeParse({
      title: "t",
      ownerId: VALID_UUID,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown platforms", () => {
    expect(
      manualCreateSchema.safeParse({
        title: "t",
        primaryPlatform: "tiktok",
        ownerId: VALID_UUID,
      }).success
    ).toBe(false);
  });

  it("rejects isDemo injection — demo authority is server/seed only", () => {
    const r = manualCreateSchema.safeParse({
      title: "t",
      primaryPlatform: "douyin",
      ownerId: VALID_UUID,
      isDemo: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejects server-owned field injection (brand/status/signal/deletedAt)", () => {
    for (const extra of [
      { brandId: VALID_UUID },
      { status: "published" },
      { sourceSignalId: VALID_UUID },
      { deletedAt: null },
      { createdAt: new Date().toISOString() },
    ]) {
      const r = manualCreateSchema.safeParse({
        title: "t",
        primaryPlatform: "xiaohongshu",
        ownerId: VALID_UUID,
        ...extra,
      });
      expect(r.success).toBe(false);
    }
  });

  it("rejects empty or overlong titles", () => {
    expect(
      manualCreateSchema.safeParse({
        title: "   ",
        primaryPlatform: "xiaohongshu",
        ownerId: VALID_UUID,
      }).success
    ).toBe(false);
    expect(
      manualCreateSchema.safeParse({
        title: "x".repeat(501),
        primaryPlatform: "xiaohongshu",
        ownerId: VALID_UUID,
      }).success
    ).toBe(false);
  });
});

describe("setPrimaryPlatformSchema", () => {
  it("accepts a platform", () => {
    expect(
      setPrimaryPlatformSchema.safeParse({ primaryPlatform: "douyin" }).success
    ).toBe(true);
  });

  it("rejects missing / unknown platform", () => {
    expect(setPrimaryPlatformSchema.safeParse({}).success).toBe(false);
    expect(
      setPrimaryPlatformSchema.safeParse({ primaryPlatform: "weibo" }).success
    ).toBe(false);
  });

  it("rejects extra fields — client cannot smuggle other mutations", () => {
    expect(
      setPrimaryPlatformSchema.safeParse({
        primaryPlatform: "xiaohongshu",
        deletedAt: null,
      }).success
    ).toBe(false);
    expect(
      setPrimaryPlatformSchema.safeParse({
        primaryPlatform: "xiaohongshu",
        status: "planning",
      }).success
    ).toBe(false);
  });
});
