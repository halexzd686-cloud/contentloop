import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { contentPillars } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";

/** GET /api/settings/pillars — active content pillars (form selects). */
export async function GET() {
  try {
    const brand = await requireSingleBrand();
    const pillars = await db
      .select({ id: contentPillars.id, name: contentPillars.name })
      .from(contentPillars)
      .where(
        and(
          eq(contentPillars.brandId, brand.id),
          eq(contentPillars.isActive, true)
        )
      );
    return NextResponse.json({ pillars });
  } catch (error) {
    console.error("GET pillars error:", error);
    return NextResponse.json({ error: "Failed to load pillars" }, { status: 500 });
  }
}
