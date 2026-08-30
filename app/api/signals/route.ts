import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, or, ilike, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { signals } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import {
  createSignalSchema,
  signalQuerySchema,
} from "@/lib/validation/signal";

/**
 * GET /api/signals — List signals with optional filter and search
 * Query params: ?status=new|reviewing|selected|skipped&search=text
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = signalQuerySchema.parse({
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
    });

    const conditions = [isNull(signals.deletedAt)];

    if (query.status) {
      conditions.push(eq(signals.status, query.status));
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(signals.title, searchPattern),
          ilike(signals.summary, searchPattern)
        )!
      );
    }

    const result = await db
      .select()
      .from(signals)
      .where(and(...conditions))
      .orderBy(desc(signals.createdAt));

    return NextResponse.json({ signals: result });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }
    console.error("GET /api/signals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/signals — Create a new signal
 * Body: { inputType, sourceUrl?, sourceType?, title, summary?, publishedAt? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSignalSchema.parse(body);

    const brand = await requireSingleBrand();

    const [signal] = await db
      .insert(signals)
      .values({
        brandId: brand.id,
        inputType: input.inputType,
        sourceUrl: input.sourceUrl || null,
        sourceType: input.sourceType || null,
        title: input.title,
        summary: input.summary || null,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
        status: "new",
      })
      .returning();

    return NextResponse.json({ signal }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid signal data", details: error.message },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes("brand")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("POST /api/signals error:", error);
    return NextResponse.json(
      { error: "Failed to create signal" },
      { status: 500 }
    );
  }
}
