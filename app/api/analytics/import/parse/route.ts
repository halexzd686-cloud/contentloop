import { NextRequest, NextResponse } from "next/server";

import { parseFile, parseSheet, ImportError } from "@/lib/import/parse";

/**
 * POST /api/analytics/import/parse — M2.7 step 1.
 * Multipart: file. Returns hash / type / sheets (+ headers and up to
 * 3 sample rows per sheet for the mapping step). No DB writes.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseFile(bytes, file.name);

    const sheets = parsed.sheets.map((s) => {
      try {
        const sheet = parseSheet(bytes, file.name, s.name);
        return {
          ...s,
          headers: sheet.headers,
          sampleRows: sheet.rows.slice(0, 3),
        };
      } catch {
        return { ...s, headers: [], sampleRows: [] };
      }
    });

    return NextResponse.json({
      fileHash: parsed.fileHash,
      fileType: parsed.fileType,
      sheets,
    });
  } catch (error) {
    if (error instanceof ImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("import parse error:", error);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
