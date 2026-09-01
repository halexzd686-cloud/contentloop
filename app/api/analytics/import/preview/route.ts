import { NextRequest, NextResponse } from "next/server";

import { buildImportPreview } from "@/lib/import/service";
import { ImportError } from "@/lib/import/parse";
import { ReviewError } from "@/lib/review";
import type { ImportConfig } from "@/lib/import/service";

/**
 * POST /api/analytics/import/preview — M2.7 step 3.
 * Multipart: file + config (JSON string). The server RE-PARSES the
 * original file — client-parsed rows are display-only, never trusted.
 * No snapshot writes.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const configRaw = form.get("config");
    if (!(file instanceof File) || typeof configRaw !== "string") {
      return NextResponse.json({ error: "Missing file or config" }, { status: 400 });
    }
    const config = JSON.parse(configRaw) as ImportConfig;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const preview = await buildImportPreview(bytes, file.name, config);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof ImportError || error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("import preview error:", error);
    return NextResponse.json({ error: "Failed to build preview" }, { status: 500 });
  }
}
