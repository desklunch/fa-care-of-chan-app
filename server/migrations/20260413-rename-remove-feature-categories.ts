import { db } from "../db";
import { appFeatureCategories, appFeatures } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function migrate() {
  const allCats = await db.select().from(appFeatureCategories);
  console.log(
    "Before:",
    allCats.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive })),
  );

  const otherCat = allCats.find((c) => c.name === "Other");
  const appCat = allCats.find((c) => c.name === "App");
  const interfaceCat = allCats.find((c) => c.name === "Interface");

  if (otherCat && appCat) {
    console.error(
      'Both "Other" and "App" categories exist. Manual resolution required: merge or deactivate "Other" before running this migration.',
    );
    process.exit(1);
  }

  const targetCat = appCat || otherCat;

  if (!targetCat) {
    console.error(
      'Could not find "Other" or "App" category. Migration may have already been applied or categories are missing.',
    );
    process.exit(1);
  }

  await db.transaction(async (tx) => {
    if (otherCat && !appCat) {
      await tx
        .update(appFeatureCategories)
        .set({ name: "App", updatedAt: new Date() })
        .where(eq(appFeatureCategories.id, otherCat.id));
      console.log(`Renamed "Other" (${otherCat.id}) to "App"`);
    } else if (appCat) {
      console.log(`"App" category already exists (${appCat.id}), skipping rename`);
    }

    if (interfaceCat) {
      const reassigned = await tx
        .update(appFeatures)
        .set({ categoryId: targetCat.id, updatedAt: new Date() })
        .where(eq(appFeatures.categoryId, interfaceCat.id))
        .returning();
      console.log(
        `Reassigned ${reassigned.length} features from "Interface" to "App"`,
      );

      if (interfaceCat.isActive) {
        await tx
          .update(appFeatureCategories)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(appFeatureCategories.id, interfaceCat.id));
        console.log(
          `Deactivated "Interface" category (${interfaceCat.id})`,
        );
      } else {
        console.log(`"Interface" already inactive, skipping deactivation`);
      }
    } else {
      console.log('No "Interface" category found, nothing to reassign');
    }
  });

  const finalCats = await db.select().from(appFeatureCategories);
  console.log(
    "\nAfter:",
    finalCats.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive })),
  );

  const remainingInInterface = interfaceCat
    ? await db
        .select()
        .from(appFeatures)
        .where(eq(appFeatures.categoryId, interfaceCat.id))
    : [];
  console.log(
    `Features still assigned to Interface: ${remainingInInterface.length}`,
  );

  process.exit(0);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
