import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/**
 * GET /api/health — liveness probe that touches the database once.
 *
 * Used by the Vercel cron keep-alive (vercel.json) so the Supabase
 * free-tier project stays above the 7-day inactivity auto-pause
 * threshold. Also useful as a plain health check.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GET /api/health error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
