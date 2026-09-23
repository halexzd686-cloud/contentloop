import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { platformPlaybooks } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { playbookUpsertSchema } from "@/lib/validation/playbook";

/** GET /api/settings/playbooks — platform playbooks (read-only Settings view). */
export async function GET() {
  try {
    const brand = await requireSingleBrand();
    const playbooks = await db
      .select({
        platform: platformPlaybooks.platform,
        voice: platformPlaybooks.voice,
        titleStyle: platformPlaybooks.titleStyle,
        hookStyle: platformPlaybooks.hookStyle,
        structure: platformPlaybooks.structure,
        cta: platformPlaybooks.cta,
        avoid: platformPlaybooks.avoid,
        goodExamples: platformPlaybooks.goodExamples,
        updatedAt: platformPlaybooks.updatedAt,
      })
      .from(platformPlaybooks)
      .where(eq(platformPlaybooks.brandId, brand.id));
    return NextResponse.json({ playbooks });
  } catch (error) {
    console.error("GET playbooks error:", error);
    return NextResponse.json(
      { error: "Failed to load playbooks" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/playbooks — human save (AGENTS §21).
 *
 * Upsert on (brand, platform). This is the ONLY write path — the AI
 * draft route never persists. No versioning in V1.
 */
export async function PUT(request: NextRequest) {
  try {
    const brand = await requireSingleBrand();
    const body = await request.json();
    const parsed = playbookUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid playbook payload" },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const [saved] = await db
      .insert(platformPlaybooks)
      .values({
        brandId: brand.id,
        ...input,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [platformPlaybooks.brandId, platformPlaybooks.platform],
        set: {
          voice: input.voice,
          titleStyle: input.titleStyle,
          hookStyle: input.hookStyle,
          structure: input.structure,
          cta: input.cta,
          avoid: input.avoid,
          goodExamples: input.goodExamples,
          updatedAt: new Date(),
        },
      })
      .returning();
    return NextResponse.json({ playbook: saved });
  } catch (error) {
    console.error("PUT playbooks error:", error);
    return NextResponse.json(
      { error: "Failed to save playbook" },
      { status: 500 }
    );
  }
}
