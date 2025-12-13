import * as fs from 'fs';
import { db } from '../server/db';
import { venues, venuePhotos } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { Storage } from '@google-cloud/storage';

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const csvPath = 'attached_assets/COC_Sanity_Venue_Photos_(1)_1765639892348.csv';
const failedLogPath = 'scripts/failed-photo-imports.log';

const BUCKET_NAME = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || 'replit-objstore-62c8b438-b199-4509-bf13-15ef94117184';
const PRIVATE_DIR = '.private';

interface PhotoRow {
  venue_external_id: string;
  sort_order: string;
  alt_text: string;
  url: string;
}

function parseCSV(content: string): PhotoRow[] {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: PhotoRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else current += char;
    }
    values.push(current.trim());
    
    const row: any = {};
    headers.forEach((h, idx) => row[h] = values[idx] || '');
    rows.push(row as PhotoRow);
  }
  return rows;
}

async function clearStorage() {
  console.log('Clearing existing photos from storage...');
  const bucket = objectStorageClient.bucket(BUCKET_NAME);
  
  const directoriesToClear = ['photos/', 'thumbnails/', `${PRIVATE_DIR}/venues/`];
  
  for (const dir of directoriesToClear) {
    try {
      const [files] = await bucket.getFiles({ prefix: dir });
      if (files.length > 0) {
        console.log(`  Deleting ${files.length} files from ${dir}...`);
        for (const file of files) {
          await file.delete();
        }
      } else {
        console.log(`  No files found in ${dir}`);
      }
    } catch (e) {
      console.log(`  Directory ${dir} - no files or doesn't exist`);
    }
  }
  console.log('Storage cleared.');
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageDownloader/1.0)',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    return null;
  }
}

function getContentType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || 'jpg';
  const types: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
  };
  return types[ext] || 'image/jpeg';
}

function getFileExtension(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || 'jpg';
  return ext === 'jpeg' ? 'jpg' : ext;
}

async function uploadToStorage(buffer: Buffer, objectPath: string, contentType: string): Promise<string> {
  const bucket = objectStorageClient.bucket(BUCKET_NAME);
  const fullPath = `${PRIVATE_DIR}/${objectPath}`;
  const file = bucket.file(fullPath);
  
  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=604800',
    },
  });
  
  return `/objects/${objectPath}`;
}

async function main() {
  const failedImports: string[] = [];
  
  // Clear existing storage
  await clearStorage();
  
  // Clear venue_photos table
  console.log('Clearing venue_photos table...');
  await db.delete(venuePhotos);
  console.log('Table cleared.');
  
  // Load venue external_id to id mapping
  console.log('Loading venue mapping...');
  const allVenues = await db.select({ id: venues.id, externalId: venues.externalId }).from(venues);
  const venueMap = new Map<string, string>();
  for (const v of allVenues) {
    if (v.externalId) {
      venueMap.set(v.externalId, v.id);
    }
  }
  console.log(`Loaded ${venueMap.size} venues with external IDs`);
  
  // Parse CSV
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  console.log(`Found ${rows.length} photo records to import`);
  
  // Track unique URLs to avoid re-downloading duplicates
  const downloadedUrls = new Map<string, string>(); // url -> storagePath
  
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const venueId = venueMap.get(row.venue_external_id);
    
    if (!venueId) {
      const msg = `Row ${i + 2}: Venue not found for external_id: ${row.venue_external_id}`;
      console.log(`  SKIP: ${msg}`);
      failedImports.push(msg);
      skipped++;
      continue;
    }
    
    let storagePath: string;
    
    // Check if we already downloaded this URL
    if (downloadedUrls.has(row.url)) {
      storagePath = downloadedUrls.get(row.url)!;
    } else {
      // Download the image
      const imageBuffer = await downloadImage(row.url);
      if (!imageBuffer) {
        const msg = `Row ${i + 2}: Failed to download ${row.url}`;
        console.log(`  FAIL: ${msg}`);
        failedImports.push(msg);
        failed++;
        continue;
      }
      
      // Generate storage path
      const ext = getFileExtension(row.url);
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const objectPath = `venues/${venueId}/photos/${filename}`;
      const contentType = getContentType(row.url);
      
      try {
        storagePath = await uploadToStorage(imageBuffer, objectPath, contentType);
        downloadedUrls.set(row.url, storagePath);
        console.log(`  Uploaded: ${row.alt_text || 'photo'} -> ${storagePath}`);
      } catch (e) {
        const msg = `Row ${i + 2}: Failed to upload ${row.url} - ${e}`;
        console.log(`  FAIL: ${msg}`);
        failedImports.push(msg);
        failed++;
        continue;
      }
    }
    
    // Determine if this is a hero image (no sort_order or first one)
    const sortOrder = row.sort_order ? parseInt(row.sort_order, 10) : 0;
    const isHero = !row.sort_order || row.sort_order === '';
    
    // Insert into venue_photos
    try {
      await db.insert(venuePhotos).values({
        venueId,
        url: storagePath,
        altText: row.alt_text || null,
        sortOrder,
        isHero,
      });
      imported++;
      if (imported % 50 === 0) {
        console.log(`Progress: ${imported} photos imported...`);
      }
    } catch (e) {
      const msg = `Row ${i + 2}: DB insert failed for ${row.url} - ${e}`;
      console.log(`  FAIL: ${msg}`);
      failedImports.push(msg);
      failed++;
    }
  }
  
  // Write failed imports log
  if (failedImports.length > 0) {
    fs.writeFileSync(failedLogPath, failedImports.join('\n'), 'utf-8');
    console.log(`\nFailed imports logged to: ${failedLogPath}`);
  }
  
  console.log(`\n=== Import Complete ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (venue not found): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Unique images downloaded: ${downloadedUrls.size}`);
  
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
