import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  contentBriefs,
  contentMasters,
  platformPlaybooks,
  platformVersions,
  signals,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { isPlatform, normalizePlatformData } from "@/lib/validation/platform-version";
import { adaptPlatform } from "@/lib/ai/adapt-platform";
import { createDeepSeekProvider, AIProviderError } from "@/lib/ai/provider";

/**
 * POST /api/contents/[id]/versions/[platform]/adapt — M1.5
 *
 * AI Adapt / Re-adapt. Returns a structured PROPOSAL only — this
 * endpoint NEVER writes to the database. The human Applies (initial)
 * or Accepts (re-adapt) via the normal POST/PUT version endpoints.
 *
 * Gate: Master must exist and Brief must be approved. Locked
 * upstream → 409, same as create/edit.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; platform: string }> }
) {
  try {
    const { id, platform } = await params;
    if (!isPlatform(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    const brand = await requireSingleBrand();

    const [content] = await db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.id, id),
          eq(contents.brandId, brand.id),
          isNull(contents.deletedAt)
        )
      );

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const [brief] = await db
      .select()
      .from(contentBriefs)
      .where(eq(contentBriefs.contentId, id));

    const [master] = await db
      .select()
      .from(contentMasters)
      .where(eq(contentMasters.contentId, id));

    if (!master || brief?.status !== "approved") {
      return NextResponse.json(
        {
          error: master
            ? "Brief has changed. Re-approve it to continue editing platform versions."
            : "Create the Content Master before adapting platform versions.",
        },
        { status: 409 }
      );
    }

    const [version] = await db
      .select()
      .from(platformVersions)
      .where(
        and(
          eq(platformVersions.contentId, id),
          eq(platformVersions.platform, platform)
        )
      );

    // Re-adapt is only meaningful on an editable draft.
    if (version && version.status !== "draft") {
      return NextResponse.json(
        { error: `Version status "${version.status}" cannot be re-adapted in M1.5.` },
        { status: 409 }
      );
    }

    const [signal] = content.sourceSignalId
      ? await db
          .select({
            title: signals.title,
            summary: signals.summary,
            sourceUrl: signals.sourceUrl,
            selectedAngle: signals.selectedAngle,
            primaryPlatform: signals.primaryPlatform,
          })
          .from(signals)
          .where(eq(signals.id, content.sourceSignalId))
      : [null];

    const [playbook] = await db
      .select()
      .from(platformPlaybooks)
      .where(
        and(
          eq(platformPlaybooks.brandId, brand.id),
          eq(platformPlaybooks.platform, platform)
        )
      );

    const result = await adaptPlatform(
      {
        targetPlatform: platform,
        content: { title: content.title },
        brief: {
          targetAudience: brief.targetAudience,
          userProblem: brief.userProblem,
          coreQuestion: brief.coreQuestion,
          mainAngle: brief.mainAngle,
          contentPromise: brief.contentPromise,
          keyEvidence: brief.keyEvidence,
          differentiation: brief.differentiation,
          cta: brief.cta,
        },
        masterModules: master.modules,
        signal: signal ?? null,
        brandTargetAudience: brand.targetAudience,
        playbook: playbook
          ? {
              voice: playbook.voice,
              titleStyle: playbook.titleStyle,
              hookStyle: playbook.hookStyle,
              structure: playbook.structure,
              cta: playbook.cta,
              avoid: playbook.avoid,
              goodExamples: playbook.goodExamples ?? null,
            }
          : null,
        existingData: version
          ? normalizePlatformData(platform, version.data)
          : null,
      },
      createDeepSeekProvider()
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: `Adaptation failed: ${result.error}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      proposal: result.proposal,
      hasPlaybook: !!playbook,
      isReAdapt: !!version,
    });
  } catch (error) {
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("POST /api/contents/[id]/versions/[platform]/adapt error:", error);
    return NextResponse.json(
      { error: "Failed to adapt platform version" },
      { status: 500 }
    );
  }
}
