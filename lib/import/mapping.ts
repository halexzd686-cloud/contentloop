/**
 * Column mapping — M2.7. Deterministic suggestions only: exact machine
 * key, or normalized-exact displayName / alias. Everything else stays
 * unmapped until a human maps it. No fuzzy, no AI.
 */

export interface ColumnMapping {
  /** Source column names for identity fields. */
  publicationUrl: string | null;
  publicationId: string | null;
  checkpoint: string | null;
  capturedAt: string | null;
  /** Optional row-level platform validation column. */
  platform: string | null;
  /** metricKey → source column (null = mapped to nothing). */
  metrics: Record<string, string | null>;
  /** metricKeys the human explicitly declared "N/A for all rows". */
  metricNAAll: string[];
}

export const EMPTY_MAPPING: Omit<ColumnMapping, "metrics" | "metricNAAll"> = {
  publicationUrl: null,
  publicationId: null,
  checkpoint: null,
  capturedAt: null,
  platform: null,
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

const IDENTITY_SUGGESTIONS: Record<
  keyof Omit<ColumnMapping, "metrics" | "metricNAAll">,
  string[]
> = {
  publicationUrl: ["publication_url", "url", "link", "链接", "笔记链接", "视频链接", "作品链接"],
  publicationId: ["publication_id", "publicationid", "id"],
  checkpoint: ["checkpoint", "24h/72h", "检查点", "节点"],
  capturedAt: ["captured_at", "capturedat", "capture time", "采集时间", "统计时间", "数据时间"],
  platform: ["platform", "平台"],
};

export function suggestIdentityMapping(
  headers: string[]
): Omit<ColumnMapping, "metrics" | "metricNAAll"> {
  const out = { ...EMPTY_MAPPING };
  const lower = headers.map((h) => ({ raw: h, norm: norm(h) }));
  for (const [field, aliases] of Object.entries(IDENTITY_SUGGESTIONS)) {
    const hit = lower.find((h) => aliases.includes(h.norm));
    (out as Record<string, string | null>)[field] = hit?.raw ?? null;
  }
  return out;
}

/**
 * Suggest metric mappings for the given active raw definitions.
 * Exact key → exact displayName/alias (normalized). Otherwise null.
 */
export function suggestMetricMapping(
  headers: string[],
  definitions: { key: string; displayName: string; alias: string | null }[]
): Record<string, string | null> {
  const lower = new Map(headers.map((h) => [norm(h), h]));
  const out: Record<string, string | null> = {};
  for (const d of definitions) {
    const candidates = [d.key, d.displayName, d.alias].filter(
      (x): x is string => !!x
    );
    let match: string | null = null;
    for (const c of candidates) {
      const hit = lower.get(norm(c));
      if (hit) {
        match = hit;
        break;
      }
    }
    out[d.key] = match;
  }
  return out;
}

/** Mapping validation: no source column mapped twice; derived never mapped (caller passes only raw defs). */
export function validateMapping(
  mapping: ColumnMapping,
  headers: string[]
): string[] {
  const errors: string[] = [];
  const used = new Map<string, string>();

  const claim = (source: string | null, target: string) => {
    if (!source) return;
    if (!headers.includes(source)) {
      errors.push(`Mapped column "${source}" (${target}) does not exist in the file.`);
      return;
    }
    const prev = used.get(source);
    if (prev) {
      errors.push(`Column "${source}" is mapped to both "${prev}" and "${target}".`);
      return;
    }
    used.set(source, target);
  };

  claim(mapping.publicationUrl, "publication_url");
  claim(mapping.publicationId, "publication_id");
  claim(mapping.checkpoint, "checkpoint");
  claim(mapping.capturedAt, "captured_at");
  claim(mapping.platform, "platform");
  for (const [key, source] of Object.entries(mapping.metrics)) {
    claim(source, `metric:${key}`);
  }

  if (!mapping.publicationUrl && !mapping.publicationId) {
    errors.push("Map either publication_url or publication_id.");
  }
  if (!mapping.checkpoint) {
    errors.push("Map the checkpoint column.");
  }
  return errors;
}
