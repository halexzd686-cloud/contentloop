import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { diagnoses } from "@/lib/db/schema";
import { ReviewError } from "@/lib/review";
import {
  buildDiagnosisContext,
  resolveEvidenceRefs,
} from "@/lib/metrics/diagnosis-context";
import { diagnoseCheckpoint } from "@/lib/ai/diagnose";
import { createDeepSeekProvider } from "@/lib/ai/provider";
import type { DiagnosisSaveInput } from "@/lib/validation/diagnosis";
import type { Checkpoint } from "@/lib/validation/snapshot";
import { buildWhatHappened } from "@/lib/metrics/what-happened";

/**
 * Diagnosis domain — M2.6.
 *
 * Generate = proposal only (zero DB writes). Save = POST create (409 if
 * one exists). Replace = PUT after human confirm (404 if none;
 * delete+insert in one transaction for a fresh id/createdAt — no
 * inbound FKs reference diagnoses).
 *
 * Save authority: server rebuilds the context, re-checks the proposal
 * context fingerprint, and re-resolves evidence numbers itself. The
 * client never supplies metric values. AI is NOT re-called on save.
 */

export async function generateDiagnosisProposal(
  publicationId: string,
  checkpoint: Checkpoint
) {
  const ctx = await buildDiagnosisContext(publicationId, checkpoint);

  const result = await diagnoseCheckpoint(ctx, createDeepSeekProvider(), {
    validateRefs: (refs) => {
      try {
        resolveEvidenceRefs(refs, ctx);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "Invalid evidence reference";
      }
    },
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  // Evidence numbers resolved server-side — never model-authored.
  const evidence = resolveEvidenceRefs(result.proposal.evidenceRefs, ctx);

  return {
    ok: true as const,
    proposal: {
      // Canonical server-built summary — the model never writes numbers.
      whatHappened: buildWhatHappened(evidence, checkpoint),
      evidenceRefs: result.proposal.evidenceRefs,
      possibleReasons: result.proposal.possibleReasons,
      confidence: result.proposal.confidence,
      nextActions: result.proposal.nextActions,
    },
    resolvedEvidence: evidence,
    proposalContextFingerprint: ctx.contextFp,
  };
}

async function persistDiagnosis(
  publicationId: string,
  checkpoint: Checkpoint,
  input: DiagnosisSaveInput,
  mode: "create" | "replace"
) {
  const ctx = await buildDiagnosisContext(publicationId, checkpoint);

  // Existence semantics first: PUT nonexistent → 404, POST duplicate → 409,
  // regardless of proposal freshness.
  const [existingRow] = await db
    .select({ id: diagnoses.id })
    .from(diagnoses)
    .where(eq(diagnoses.metricSnapshotId, ctx.snapshot.id));
  if (mode === "create" && existingRow) {
    throw new ReviewError(
      "A diagnosis already exists for this snapshot. Use Replace.",
      409
    );
  }
  if (mode === "replace" && !existingRow) {
    throw new ReviewError("No diagnosis exists to replace.", 404);
  }

  // Freshness: any authoritative input changed since Generate → reject.
  if (ctx.contextFp !== input.proposalContextFingerprint) {
    throw new ReviewError(
      "Analysis inputs changed since this proposal was generated. Regenerate before saving.",
      409
    );
  }

  const evidence = resolveEvidenceRefs(input.evidenceRefs, ctx);

  const values = {
    publicationId: ctx.publication.id,
    metricSnapshotId: ctx.snapshot.id,
    // Save-time authority: rebuilt from server-resolved evidence, so
    // client-supplied or stale prose can never diverge from the numbers.
    whatHappened: buildWhatHappened(evidence, checkpoint),
    evidence,
    possibleReasons: input.possibleReasons,
    confidence: input.confidence,
    nextActions: input.nextActions,
    subjectFingerprint: ctx.subjectFp,
  };

  return db.transaction(async (tx) => {
    // Re-check inside the transaction (race guard; DB unique is final).
    const [existing] = await tx
      .select({ id: diagnoses.id })
      .from(diagnoses)
      .where(eq(diagnoses.metricSnapshotId, ctx.snapshot.id));

    if (mode === "create" && existing) {
      throw new ReviewError(
        "A diagnosis already exists for this snapshot. Use Replace.",
        409
      );
    }
    if (mode === "replace" && !existing) {
      throw new ReviewError("No diagnosis exists to replace.", 404);
    }
    if (mode === "replace" && existing) {
      await tx.delete(diagnoses).where(eq(diagnoses.id, existing.id));
    }

    const [row] = await tx.insert(diagnoses).values(values).returning();
    return { diagnosis: row };
  });
}

export function saveDiagnosis(
  publicationId: string,
  checkpoint: Checkpoint,
  input: DiagnosisSaveInput
) {
  return persistDiagnosis(publicationId, checkpoint, input, "create");
}

export function replaceDiagnosis(
  publicationId: string,
  checkpoint: Checkpoint,
  input: DiagnosisSaveInput
) {
  return persistDiagnosis(publicationId, checkpoint, input, "replace");
}

/** Read the current diagnosis for a snapshot (null when none). */
export async function getDiagnosis(snapshotId: string) {
  const [row] = await db
    .select()
    .from(diagnoses)
    .where(eq(diagnoses.metricSnapshotId, snapshotId));
  return row ?? null;
}
