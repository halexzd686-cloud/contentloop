import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { signals, contentPillars } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { createDeepSeekProvider } from "@/lib/ai/provider";
import { aiUserMessage } from "@/lib/ai/user-error";
import {
  analyzeSignal,
  buildAnalysisUpdate,
  canAnalyzeStatus,
} from "@/lib/ai/analyze-signal";

/**
 * AI request budgets run up to the 60s provider timeout. Declare the
 * matching route ceiling so hosts (e.g. Vercel) don't cut earlier.
 * Requires a plan allowing maxDuration=60; otherwise use the
 * Docker/VPS fallback documented in README.
 */
export const maxDuration = 60;

/**
 * POST /api/signals/[id]/analyze
 *
 * Structured Signal Analysis (M1.2B):
 * 1. Require current Brand
 * 2. Load Signal, verify it belongs to Brand
 * 3. Verify status allows Analyze (new/reviewing only)
 * 4. Load Brand context + active Content Pillars
 * 5. Build bounded AI input (real data only — sourceUrl is metadata,
 *    the webpage is never read)
 * 6. Call analyzeSignal() (max 2 model requests, Zod-validated)
 * 7. Server computes overall topicScore
 * 8. Persist only fully valid output; on failure previous analysis
 *    remains untouched
 *
 * AI never modifies status / skipReason / selectedAngle /
 * primaryPlatform / ownerId.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: signalId } = await params;

    const brand = await requireSingleBrand();

    // Load signal, verify brand ownership
    const [signal] = await db
      .select()
      .from(signals)
      .where(
        and(
          eq(signals.id, signalId),
          eq(signals.brandId, brand.id),
          isNull(signals.deletedAt)
        )
      );

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    if (!canAnalyzeStatus(signal.status)) {
      return NextResponse.json(
        {
          error: `Cannot analyze signal with status "${signal.status}". Only new or reviewing signals can be analyzed.`,
        },
        { status: 400 }
      );
    }

    // Load active content pillars for brand context
    const pillars = await db
      .select({
        name: contentPillars.name,
        description: contentPillars.description,
        primaryGoal: contentPillars.primaryGoal,
      })
      .from(contentPillars)
      .where(
        and(
          eq(contentPillars.brandId, brand.id),
          eq(contentPillars.isActive, true)
        )
      );

    // Call AI with bounded, real input
    let provider;
    try {
      provider = createDeepSeekProvider();
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "AI not configured" },
        { status: 503 }
      );
    }

    const result = await analyzeSignal(
      {
        inputType: signal.inputType,
        title: signal.title,
        summary: signal.summary,
        sourceType: signal.sourceType,
        sourceUrl: signal.sourceUrl,
        publishedAt: signal.publishedAt,
        brandTargetAudience: brand.targetAudience,
        brandEnabledPlatforms: brand.enabledPlatforms,
        pillars,
      },
      provider
    );

    if (!result.ok) {
      // Failure: previous valid analysis remains unchanged.
      // Internal detail goes to logs; client gets sanitized copy (M4.3).
      console.error("signal analysis failed:", result.error);
      return NextResponse.json(
        { error: aiUserMessage(result.error) },
        { status: 502 }
      );
    }

    // Persist only fully validated output (server-computed overall score)
    const update = buildAnalysisUpdate(result.analysis);

    const [updatedSignal] = await db
      .update(signals)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(signals.id, signalId))
      .returning();

    return NextResponse.json({ signal: updatedSignal });
  } catch (error) {
    console.error("POST /api/signals/[id]/analyze error:", error);
    return NextResponse.json(
      { error: "Failed to analyze signal" },
      { status: 500 }
    );
  }
}
