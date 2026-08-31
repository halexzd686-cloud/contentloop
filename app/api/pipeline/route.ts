import { NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  contentBriefs,
  contentMasters,
  contentReviews,
  platformVersions,
  teamMembers,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";

/**
 * GET /api/pipeline — M1.6 Pipeline board data.
 *
 * One round of queries (no N+1): all brand Contents + owner/reviewer
 * names + Brief status + Master existence + PlatformVersion statuses
 * + checklist completion per version.
 */
export async function GET() {
  try {
    const brand = await requireSingleBrand();

    const rows = await db
      .select()
      .from(contents)
      .where(and(eq(contents.brandId, brand.id), isNull(contents.deletedAt)));

    if (rows.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const contentIds = rows.map((c) => c.id);

    const [briefs, masters, versions, members] = await Promise.all([
      db
        .select({ contentId: contentBriefs.contentId, status: contentBriefs.status })
        .from(contentBriefs)
        .where(inArray(contentBriefs.contentId, contentIds)),
      db
        .select({ contentId: contentMasters.contentId })
        .from(contentMasters)
        .where(inArray(contentMasters.contentId, contentIds)),
      db
        .select()
        .from(platformVersions)
        .where(inArray(platformVersions.contentId, contentIds)),
      db
        .select({ id: teamMembers.id, name: teamMembers.name })
        .from(teamMembers)
        .where(eq(teamMembers.brandId, brand.id)),
    ]);

    const reviews = versions.length
      ? await db
          .select()
          .from(contentReviews)
          .where(
            inArray(
              contentReviews.platformVersionId,
              versions.map((v) => v.id)
            )
          )
      : [];

    const memberName = new Map(members.map((m) => [m.id, m.name]));
    const briefBy = new Map(briefs.map((b) => [b.contentId, b.status]));
    const masterSet = new Set(masters.map((m) => m.contentId));
    const reviewByVersion = new Map(reviews.map((r) => [r.platformVersionId, r]));

    const items = rows.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      ownerName: c.ownerId ? (memberName.get(c.ownerId) ?? null) : null,
      reviewerName: c.reviewerId ? (memberName.get(c.reviewerId) ?? null) : null,
      deadlineAt: c.deadlineAt,
      scheduledAt: c.scheduledAt,
      briefStatus: briefBy.get(c.id) ?? null,
      hasMaster: masterSet.has(c.id),
      platforms: versions
        .filter((v) => v.contentId === c.id)
        .map((v) => {
          const r = reviewByVersion.get(v.id);
          const checklist = r
            ? [
                r.factsConfirmed,
                r.titleCoverMatch,
                r.platformFitConfirmed,
                r.riskChecked,
                r.humanReviewed,
              ]
            : null;
          return {
            platform: v.platform,
            status: v.status,
            checklistDone: checklist ? checklist.filter(Boolean).length : 0,
            checklistTotal: 5,
          };
        }),
    }));

    // Stable board order: most recently updated first.
    const updatedBy = new Map(rows.map((c) => [c.id, c.updatedAt]));
    items.sort(
      (a, b) =>
        new Date(updatedBy.get(b.id) ?? 0).getTime() -
        new Date(updatedBy.get(a.id) ?? 0).getTime()
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/pipeline error:", error);
    return NextResponse.json({ error: "Failed to load pipeline" }, { status: 500 });
  }
}
