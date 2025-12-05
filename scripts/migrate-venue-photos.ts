import { db } from "../server/db";
import { venues } from "../shared/schema";
import { eq } from "drizzle-orm";

const BATCH_SIZE = 5;
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com' 
  : 'http://localhost:5000';

interface MigrationResult {
  venueId: string;
  venueName: string;
  success: boolean;
  migratedPhotos: number;
  errors: string[];
}

async function uploadPhotoFromUrl(
  url: string,
  venueId?: string
): Promise<{ photoUrl: string; thumbnailUrl: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/api/photos/from-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, venueId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to upload photo from ${url}:`, error);
    return null;
  }
}

function isExternalUrl(url: string | null): boolean {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

function isGooglePlacesProxy(url: string | null): boolean {
  if (!url) return false;
  return url.startsWith("/api/places/photos/");
}

function needsMigration(url: string | null): boolean {
  if (!url) return false;
  return isExternalUrl(url) || isGooglePlacesProxy(url);
}

async function migrateVenuePhotos(venue: {
  id: string;
  name: string;
  photoUrls: string[] | null;
}): Promise<MigrationResult> {
  const result: MigrationResult = {
    venueId: venue.id,
    venueName: venue.name,
    success: true,
    migratedPhotos: 0,
    errors: [],
  };

  const newPhotoUrls: string[] = [];

  if (venue.photoUrls && venue.photoUrls.length > 0) {
    for (const photoUrl of venue.photoUrls) {
      if (needsMigration(photoUrl)) {
        console.log(`  Migrating gallery photo: ${photoUrl}`);
        const uploaded = await uploadPhotoFromUrl(photoUrl, venue.id);
        if (uploaded) {
          newPhotoUrls.push(uploaded.photoUrl);
          result.migratedPhotos++;
        } else {
          result.errors.push(`Failed to migrate gallery photo: ${photoUrl}`);
          result.success = false;
          newPhotoUrls.push(photoUrl);
        }
      } else {
        newPhotoUrls.push(photoUrl);
      }
    }
  }

  if (result.migratedPhotos > 0) {
    await db
      .update(venues)
      .set({
        photoUrls: newPhotoUrls.length > 0 ? newPhotoUrls : null,
      })
      .where(eq(venues.id, venue.id));
  }

  return result;
}

async function runMigration(dryRun: boolean = false) {
  console.log(`\n=== Venue Photo Migration ${dryRun ? "(DRY RUN)" : ""} ===\n`);

  const allVenues = await db
    .select({
      id: venues.id,
      name: venues.name,
      photoUrls: venues.photoUrls,
    })
    .from(venues);

  const venuesToMigrate = allVenues.filter((venue) => {
    const hasGalleryToMigrate = venue.photoUrls?.some(needsMigration) ?? false;
    return hasGalleryToMigrate;
  });

  console.log(`Found ${allVenues.length} total venues`);
  console.log(`Found ${venuesToMigrate.length} venues with photos to migrate\n`);

  if (venuesToMigrate.length === 0) {
    console.log("No photos need migration. All photos are already in App Storage.");
    return;
  }

  if (dryRun) {
    console.log("DRY RUN - No changes will be made\n");
    for (const venue of venuesToMigrate) {
      console.log(`Venue: ${venue.name} (ID: ${venue.id})`);
      const galleryToMigrate = venue.photoUrls?.filter(needsMigration) ?? [];
      if (galleryToMigrate.length > 0) {
        console.log(`  - ${galleryToMigrate.length} gallery photos to migrate`);
        galleryToMigrate.forEach((url) => console.log(`    - ${url}`));
      }
    }
    return;
  }

  const results: MigrationResult[] = [];
  for (let i = 0; i < venuesToMigrate.length; i += BATCH_SIZE) {
    const batch = venuesToMigrate.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

    for (const venue of batch) {
      console.log(`\nMigrating venue: ${venue.name} (ID: ${venue.id})`);
      const result = await migrateVenuePhotos(venue);
      results.push(result);
    }

    if (i + BATCH_SIZE < venuesToMigrate.length) {
      console.log("Waiting between batches...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n=== Migration Summary ===\n");
  
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const totalMigrated = results.reduce((sum, r) => sum + r.migratedPhotos, 0);

  console.log(`Total venues processed: ${results.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total photos migrated: ${totalMigrated}`);

  if (failCount > 0) {
    console.log("\n=== Failed Venues ===\n");
    for (const result of results.filter((r) => !r.success)) {
      console.log(`${result.venueName} (${result.venueId}):`);
      result.errors.forEach((e) => console.log(`  - ${e}`));
    }
  }
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

runMigration(dryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
