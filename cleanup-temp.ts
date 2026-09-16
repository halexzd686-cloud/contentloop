import { db } from "@/lib/db";
import { contents, contentBriefs, contentMasters, platformVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const CID = "62b2aab7-20ae-4265-8243-761506937bd7";

async function main() {
  const [c] = await db.select({ id: contents.id, title: contents.title }).from(contents).where(eq(contents.id, CID));
  console.log("found:", c ? c.title.slice(0, 40) : "NOT FOUND");
  if (!c) return;
  await db.delete(contentBriefs).where(eq(contentBriefs.contentId, CID));
  await db.delete(contentMasters).where(eq(contentMasters.contentId, CID));
  await db.delete(platformVersions).where(eq(platformVersions.contentId, CID));
  await db.delete(contents).where(eq(contents.id, CID));
  console.log("deleted:", CID);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
