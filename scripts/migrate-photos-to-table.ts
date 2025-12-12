import { db } from "../server/db";
import { venues, venuePhotos } from "../shared/schema";
import { sql } from "drizzle-orm";

async function migratePhotosToTable() {
  console.log("Starting photo migration to venue_photos table...");

  const venuesWithPhotos = await db.execute(sql`
    SELECT id, name, photo_urls 
    FROM venues 
    WHERE photo_urls IS NOT NULL 
      AND jsonb_array_length(photo_urls) > 0
  `);

  let totalPhotos = 0;
  let venueCount = 0;

  for (const venue of venuesWithPhotos.rows) {
    const venueId = venue.id as string;
    const venueName = venue.name as string;
    const photoUrls = venue.photo_urls as string[];

    if (!photoUrls || photoUrls.length === 0) continue;

    console.log(`Processing venue: ${venueName} (${photoUrls.length} photos)`);

    const existingPhotos = await db
      .select()
      .from(venuePhotos)
      .where(sql`${venuePhotos.venueId} = ${venueId}`);

    if (existingPhotos.length > 0) {
      console.log(`  Skipping - already has ${existingPhotos.length} photos in venue_photos table`);
      continue;
    }

    const photosToInsert = photoUrls.map((url, index) => ({
      venueId,
      url,
      altText: `${venueName} photo ${index + 1}`,
      sortOrder: index,
      isHero: index === 0,
    }));

    await db.insert(venuePhotos).values(photosToInsert);
    
    totalPhotos += photosToInsert.length;
    venueCount++;
    console.log(`  Inserted ${photosToInsert.length} photos`);
  }

  console.log(`\nMigration complete!`);
  console.log(`Migrated ${totalPhotos} photos from ${venueCount} venues`);
}

migratePhotosToTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
