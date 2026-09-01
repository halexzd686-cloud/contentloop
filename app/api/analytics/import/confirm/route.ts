import { NextRequest, NextResponse } from "next/server";

import { confirmImport } from "@/lib/import/service";
import { ImportError } from "@/lib/import/parse";
import { ReviewError } from "@/lib/review";
import type { ImportConfig } from "@/lib/import/service";

/**
 * POST /api/analytics/import/confirm — M2.7 step 4.
 * Multipart: file + config + previewFingerprint. Server re-parses the
 * file, re-runs ALL validation, verifies preview freshness, then
 * writes in ONE transaction. Any failure → full rollback.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const configRaw = form.get("config");
    const previewFingerprint = form.get("previewFingerprint");
    if (
      !(file instanceof File) ||
      typeof configRaw !== "string" ||
      typeof previewFingerprint !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing file, config or previewFingerprint" },
        { status: 400 }
      );
    }
    const config = JSON.parse(configRaw) as ImportConfig;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const result = await confirmImport(bytes, file.name, config, previewFingerprint);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ImportError || error instanceof ReviewError) {
      const status = error instanceof ReviewError ? error.status : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("import confirm error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
