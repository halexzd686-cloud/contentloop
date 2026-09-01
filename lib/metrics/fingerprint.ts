import { createHash } from "crypto";

/**
 * Deterministic subject/context fingerprints — M2.6.
 *
 * subjectFingerprint (stored on the saved Diagnosis):
 *   snapshot.id + checkpoint + capturedAt + canonical metrics +
 *   publication.finalTitle + content.pillarId
 *   → saved Diagnosis becomes stale exactly when the authoritative
 *   subject changes. Baseline drift alone never stales a saved
 *   diagnosis (evidence is frozen at diagnosis time).
 *
 * proposalContextFingerprint (proposal freshness, never persisted):
 *   subjectFingerprint + account/pillar baseline values & sample
 *   counts + active metric semantic config + published version data +
 *   brief + playbook + source context.
 *   Any change between Generate and Save → save rejected (409).
 *
 * Canonical JSON (recursively sorted keys) makes key order
 * irrelevant; sha256 keeps it compact and deterministic.
 */

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

export function fingerprintOf(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex").slice(0, 32);
}

export interface SubjectFingerprintInput {
  snapshotId: string;
  checkpoint: string;
  capturedAt: string;
  metrics: Record<string, number | null>;
  finalTitle: string;
  pillarId: string | null;
}

export function subjectFingerprint(input: SubjectFingerprintInput): string {
  return fingerprintOf(input);
}
