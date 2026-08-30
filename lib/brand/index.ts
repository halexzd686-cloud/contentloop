import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";

/**
 * V1 invariant: exactly one Brand exists.
 * - 0 brands → error (not configured)
 * - 1 brand → return it
 * - >1 brands → error (configuration anomaly)
 *
 * This is NOT multi-brand support. It enforces the single-brand constraint.
 */
export async function requireSingleBrand() {
  const allBrands = await db.select().from(brands);

  if (allBrands.length === 0) {
    throw new Error(
      "No brand configured. Run seed or create a brand in Settings."
    );
  }

  if (allBrands.length > 1) {
    throw new Error(
      `Expected exactly 1 brand, found ${allBrands.length}. This is a configuration error.`
    );
  }

  return allBrands[0];
}
