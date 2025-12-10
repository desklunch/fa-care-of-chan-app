import { db } from "../server/db";
import { appFeatureComments, comments } from "../shared/schema";
import { eq, isNull } from "drizzle-orm";

async function migrateAppFeatureComments() {
  console.log("Starting migration of app_feature_comments to unified comments table...\n");

  const dryRun = process.argv.includes("--dry-run");
  
  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  try {
    const oldComments = await db.select().from(appFeatureComments);
    
    console.log(`Found ${oldComments.length} comments to migrate\n`);
    
    if (oldComments.length === 0) {
      console.log("No comments to migrate. Done!");
      return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const oldComment of oldComments) {
      const existingComment = await db.select()
        .from(comments)
        .where(eq(comments.entityType, "app_feature"))
        .then(all => all.find(c => 
          c.entityId === oldComment.featureId && 
          c.createdById === oldComment.userId &&
          c.body === oldComment.body
        ));

      if (existingComment) {
        console.log(`⏭️  Skipping duplicate: "${oldComment.body.substring(0, 50)}..."`);
        skipped++;
        continue;
      }

      if (!dryRun) {
        await db.insert(comments).values({
          body: oldComment.body,
          entityType: "app_feature",
          entityId: oldComment.featureId,
          parentId: null,
          createdById: oldComment.userId,
          createdAt: oldComment.createdAt || new Date(),
          updatedAt: oldComment.updatedAt || new Date(),
        });
      }

      console.log(`✅ Migrated: "${oldComment.body.substring(0, 50)}${oldComment.body.length > 50 ? "..." : ""}"`);
      migrated++;
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Skipped (duplicates): ${skipped}`);
    console.log(`   - Total processed: ${oldComments.length}`);

    if (dryRun) {
      console.log("\n🔍 This was a dry run. Run without --dry-run to perform the actual migration.");
    } else {
      console.log("\n✅ Migration complete!");
      console.log("\n⚠️  Note: The old app_feature_comments table still contains data.");
      console.log("   After verifying the migration, you can manually remove the old data.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateAppFeatureComments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
