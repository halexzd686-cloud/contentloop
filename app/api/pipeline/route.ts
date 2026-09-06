import { NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  contentBriefs,
  contentMasters,
  contentReviews,
  metricSnapshots,
  platformVersions,
  publications,
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

    const versionIds = versions.map((v) => v.id);
    const pubs = versionIds.length
      ? await db
          .select()
          .from(publications)
          .where(
            and(
              inArray(publications.platformVersionId, versionIds),
              isNull(publications.deletedAt)
            )
          )
      : [];
    const snapshots = pubs.length
      ? await db
          .select()
          .from(metricSnapshots)
          .where(
            inArray(
              metricSnapshots.publicationId,
              pubs.map((p) => p.id)
            )
          )
      : [];
    const pubByVersion = new Map(pubs.map((p) => [p.platformVersionId, p]));
    const snapByKey = new Map(
      snapshots.map((s) => [`${s.publicationId}:${s.checkpoint}`, s])
    );

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
      isDemo: c.isDemo, // M4.4: demo provenance badge (read-model only)
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
          const pub = pubByVersion.get(v.id);
          return {
            versionId: v.id,
            platform: v.platform,
            status: v.status,
            checklistDone: checklist ? checklist.filter(Boolean).length : 0,
            checklistTotal: 5,
            publication: pub
              ? {
                  id: pub.id,
                  finalTitle: pub.finalTitle,
                  publishedAt: pub.publishedAt.toISOString(),
                  snapshot24h: snapByKey.has(`${pub.id}:24h`),
                  snapshot72h: snapByKey.has(`${pub.id}:72h`),
                  snapshots: {
                    "24h": snapByKey.get(`${pub.id}:24h`)
                      ? {
                          id: snapByKey.get(`${pub.id}:24h`)!.id,
                          publicationId: pub.id,
                          checkpoint: "24h",
                          capturedAt: snapByKey.get(`${pub.id}:24h`)!.capturedAt.toISOString(),
                          metrics: snapByKey.get(`${pub.id}:24h`)!.metrics,
                          source: snapByKey.get(`${pub.id}:24h`)!.source,
                          createdAt: snapByKey.get(`${pub.id}:24h`)!.createdAt.toISOString(),
                        }
                      : null,
                    "72h": snapByKey.get(`${pub.id}:72h`)
                      ? {
                          id: snapByKey.get(`${pub.id}:72h`)!.id,
                          publicationId: pub.id,
                          checkpoint: "72h",
                          capturedAt: snapByKey.get(`${pub.id}:72h`)!.capturedAt.toISOString(),
                          metrics: snapByKey.get(`${pub.id}:72h`)!.metrics,
                          source: snapByKey.get(`${pub.id}:72h`)!.source,
                          createdAt: snapByKey.get(`${pub.id}:72h`)!.createdAt.toISOString(),
                        }
                      : null,
                  },
                }
              : null,
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
