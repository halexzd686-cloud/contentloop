import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { teamMembers } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";

/**
 * GET /api/team-members — List active team members for current brand
 */
export async function GET() {
  try {
    const brand = await requireSingleBrand();

    const members = await db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        title: teamMembers.title,
      })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.brandId, brand.id), eq(teamMembers.isActive, true))
      );

    return NextResponse.json({ members });
  } catch (error) {
    console.error("GET /api/team-members error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
