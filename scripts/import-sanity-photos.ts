import { db } from "../server/db";
import { venues, venuePhotos } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { ObjectStorageService } from "../server/objectStorage";
import * as fs from "fs";
import * as readline from "readline";

const SANITY_BASE_URL = "https://cdn.sanity.io/images/h20inf57/production/";

interface SanityImage {
  _key: string;
  _type: string;
  alt?: string;
  asset: {
    _ref: string;
    _type: string;
  };
}

interface SanityVenue {
  _id: string;
  title: string;
  underCarousel?: {
    gallery?: SanityImage[];
  };
  venueCarousel?: {
    gallery?: SanityImage[];
  };
}

function sanityRefToUrl(ref: string): string {
  const withoutPrefix = ref.replace(/^image-/, "");
  const match = withoutPrefix.match(/^(.+)-(\d+x\d+)-(\w+)$/);
  if (!match) {
    throw new Error(`Invalid Sanity ref format: ${ref}`);
  }
  const [, hash, dimensions, ext] = match;
  return `${SANITY_BASE_URL}${hash}-${dimensions}.${ext}`;
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function importSanityPhotos(dryRun = false, venueFilter?: string) {
  console.log(`Starting Sanity photo import (dry run: ${dryRun})...`);
  if (venueFilter) {
    console.log(`Filtering to venues matching: ${venueFilter}`);
  }

  const storageService = new ObjectStorageService();
  const filePath = "attached_assets/venues_1765571623717.ndjson";
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let venuesProcessed = 0;
  let photosImported = 0;
  let photosSkipped = 0;
  let venuesNotFound = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    
    const sanityVenue: SanityVenue = JSON.parse(line);
    const venueName = sanityVenue.title;

    if (venueFilter && !venueName.toLowerCase().includes(venueFilter.toLowerCase())) {
      continue;
    }

    const [dbVenue] = await db
      .select()
      .from(venues)
      .where(sql`LOWER(${venues.name}) = LOWER(${venueName})`)
      .limit(1);

    if (!dbVenue) {
      console.log(`Venue not found in database: ${venueName}`);
      venuesNotFound++;
      continue;
    }

    const existingPhotos = await db
      .select()
      .from(venuePhotos)
      .where(eq(venuePhotos.venueId, dbVenue.id));

    if (existingPhotos.length > 0) {
      console.log(`Skipping ${venueName} - already has ${existingPhotos.length} photos`);
      photosSkipped += existingPhotos.length;
      continue;
    }

    const allImages: { url: string; alt: string }[] = [];

    if (sanityVenue.venueCarousel?.gallery) {
      for (const img of sanityVenue.venueCarousel.gallery) {
        try {
          const url = sanityRefToUrl(img.asset._ref);
          allImages.push({ url, alt: img.alt || `${venueName} photo` });
        } catch (e) {
          console.error(`  Invalid ref: ${img.asset._ref}`);
        }
      }
    }

    if (sanityVenue.underCarousel?.gallery) {
      for (const img of sanityVenue.underCarousel.gallery) {
        try {
          const url = sanityRefToUrl(img.asset._ref);
          allImages.push({ url, alt: img.alt || `${venueName} photo` });
        } catch (e) {
          console.error(`  Invalid ref: ${img.asset._ref}`);
        }
      }
    }

    if (allImages.length === 0) {
      console.log(`No images found for venue: ${venueName}`);
      continue;
    }

    console.log(`Processing ${venueName} (${allImages.length} images)...`);

    if (dryRun) {
      for (const img of allImages) {
        console.log(`  Would import: ${img.alt} - ${img.url}`);
      }
      photosImported += allImages.length;
      venuesProcessed++;
      continue;
    }

    const photosToInsert: { venueId: string; url: string; altText: string; sortOrder: number; isHero: boolean }[] = [];

    for (let i = 0; i < allImages.length; i++) {
      const { url: sourceUrl, alt } = allImages[i];
      
      try {
        console.log(`  Downloading: ${alt}`);
        const imageBuffer = await downloadImage(sourceUrl);
        
        const urlParts = sourceUrl.split("/").pop()!.split(".");
        const ext = urlParts.pop() || "jpg";
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const filename = `${timestamp}-${random}.${ext}`;
        const storagePath = `/objects/venues/${dbVenue.id}/photos/${filename}`;

        console.log(`  Uploading to: ${storagePath}`);
        await storageService.uploadBuffer(imageBuffer, storagePath, `image/${ext}`);

        photosToInsert.push({
          venueId: dbVenue.id,
          url: storagePath,
          altText: alt,
          sortOrder: i,
          isHero: i === 0,
        });

        photosImported++;
      } catch (error) {
        console.error(`  Failed to import: ${sourceUrl}`, error);
      }
    }

    if (photosToInsert.length > 0) {
      await db.insert(venuePhotos).values(photosToInsert);
      console.log(`  Inserted ${photosToInsert.length} photos into database`);
    }

    venuesProcessed++;
  }

  console.log("\n=== Import Summary ===");
  console.log(`Venues processed: ${venuesProcessed}`);
  console.log(`Venues not found: ${venuesNotFound}`);
  console.log(`Photos imported: ${photosImported}`);
  console.log(`Photos skipped (already exist): ${photosSkipped}`);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const venueFilter = args.find((a) => !a.startsWith("--"));

importSanityPhotos(dryRun, venueFilter)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
