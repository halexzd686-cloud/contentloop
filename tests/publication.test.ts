import { describe, it, expect } from "vitest";

import {
  publicationCreateSchema,
  publicationEditSchema,
  prefillFinalTitle,
  deriveCheckpoints,
  publicationProgress,
  PUBLISHED_AT_FUTURE_SKEW_MS,
} from "@/lib/validation/publication";

/**
 * M2.1 Publication — validation + derived-helper tests.
 * Gate / transaction / aggregate behavior is covered by the Supabase
 * smoke test; these lock the input contract and pure rules.
 */

const VALID = {
  finalTitle: "真实发布标题",
  publishedAt: new Date(Date.now() - 3600_000).toISOString(),
  url: "https://www.xiaohongshu.com/explore/abc123",
};

describe("publicationCreateSchema", () => {
  it("accepts valid human-confirmed data", () => {
    expect(publicationCreateSchema.safeParse(VALID).success).toBe(true);
  });

  it("requires finalTitle / publishedAt / url", () => {
    expect(
      publicationCreateSchema.safeParse({ ...VALID, finalTitle: "  " }).success
    ).toBe(false);
    const noTime = { ...VALID } as Record<string, unknown>;
    delete noTime.publishedAt;
    expect(publicationCreateSchema.safeParse(noTime).success).toBe(false);
    expect(
      publicationCreateSchema.safeParse({ ...VALID, url: "" }).success
    ).toBe(false);
  });

  it("rejects invalid URLs and invalid coverUrl", () => {
    expect(
      publicationCreateSchema.safeParse({ ...VALID, url: "not-a-url" }).success
    ).toBe(false);
    expect(
      publicationCreateSchema.safeParse({ ...VALID, url: "ftp://x.com/a" }).success
    ).toBe(false);
    expect(
      publicationCreateSchema.safeParse({ ...VALID, coverUrl: "blah" }).success
    ).toBe(false);
    expect(
      publicationCreateSchema.safeParse({ ...VALID, coverUrl: "" }).success
    ).toBe(true); // empty optional is fine
  });

  it("rejects a clearly future publishedAt but allows small clock skew", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(
      publicationCreateSchema.safeParse({ ...VALID, publishedAt: future }).success
    ).toBe(false);
    const skew = new Date(Date.now() + PUBLISHED_AT_FUTURE_SKEW_MS / 2).toISOString();
    expect(
      publicationCreateSchema.safeParse({ ...VALID, publishedAt: skew }).success
    ).toBe(true);
  });

  it("rejects identity fields (platform cannot be user-supplied)", () => {
    expect(
      publicationCreateSchema.safeParse({ ...VALID, platform: "bilibili" }).success
    ).toBe(false);
    expect(
      publicationCreateSchema.safeParse({ ...VALID, platformVersionId: "x" })
        .success
    ).toBe(false);
  });

  it("rejects garbage datetime", () => {
    expect(
      publicationCreateSchema.safeParse({ ...VALID, publishedAt: "yesterday" })
        .success
    ).toBe(false);
  });
});

describe("publicationEditSchema", () => {
  it("allows correcting the five editable fields only", () => {
    expect(
      publicationEditSchema.safeParse({
        ...VALID,
        notes: "fixed link",
        coverUrl: null,
      }).success
    ).toBe(true);
    expect(
      publicationEditSchema.safeParse({ ...VALID, platform: "douyin" }).success
    ).toBe(false);
  });
});

describe("prefillFinalTitle", () => {
  it("xiaohongshu / bilibili use the version title", () => {
    expect(
      prefillFinalTitle("xiaohongshu", { title: "版本标题" }, "内容标题")
    ).toBe("版本标题");
    expect(prefillFinalTitle("bilibili", { title: "视频标题" }, "内容标题")).toBe(
      "视频标题"
    );
  });

  it("douyin (no title field) falls back to Content.title", () => {
    expect(
      prefillFinalTitle("douyin", { hook: "x", script: "y" }, "内容标题")
    ).toBe("内容标题");
  });

  it("empty platform title falls back to Content.title", () => {
    expect(prefillFinalTitle("xiaohongshu", { title: "  " }, "内容标题")).toBe(
      "内容标题"
    );
  });
});

describe("deriveCheckpoints", () => {
  it("24h / 72h are purely derived from publishedAt", () => {
    const base = "2026-08-31T12:00:00.000Z";
    const cp = deriveCheckpoints(base);
    expect(cp.checkpoint24h).toBe("2026-09-01T12:00:00.000Z");
    expect(cp.checkpoint72h).toBe("2026-09-03T12:00:00.000Z");
  });
});

describe("publicationProgress", () => {
  it("counts only published over the active target set", () => {
    expect(
      publicationProgress([
        { status: "published" },
        { status: "approved" },
      ])
    ).toEqual({ published: 1, total: 2 });
    expect(
      publicationProgress([{ status: "published" }, { status: "published" }])
    ).toEqual({ published: 2, total: 2 });
    expect(publicationProgress([])).toEqual({ published: 0, total: 0 });
  });
});
