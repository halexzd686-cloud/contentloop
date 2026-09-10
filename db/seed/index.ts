/**
 * ContentLoop V1 — Bootstrap seed entry (pnpm db:seed).
 * Bootstrap configuration only. Demo data: pnpm db:seed:demo.
 */

import { seedBootstrap, closeSeedClient } from "./bootstrap";

async function main() {
  await seedBootstrap();
}

main()
  .catch((err) => {
    console.error("❌ Bootstrap failed:", err);
    process.exit(1);
  })
  .finally(() => closeSeedClient());
