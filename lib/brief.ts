/**
 * ContentBrief business logic — M1.3
 */

interface ApproverCandidate {
  id: string;
  isActive: boolean;
}

/**
 * Resolve the designated approver for a Content (V1 has no Auth):
 * reviewer (if present and active) → owner (if present and active) → null.
 * null means approval must be rejected.
 *
 * approvedBy records the designated approver, not an authenticated identity.
 */
export function resolveApprover(
  reviewer: ApproverCandidate | null,
  owner: ApproverCandidate | null
): ApproverCandidate | null {
  if (reviewer && reviewer.isActive) return reviewer;
  if (owner && owner.isActive) return owner;
  return null;
}
