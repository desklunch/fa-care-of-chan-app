import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const storage = new Storage({
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

// UUID regex pattern to match valid venue IDs
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidVenuePath(objectName: string): boolean {
  // Valid paths should be: .private/venues/{uuid}/photos/... or .private/venues/{uuid}/thumbnails/...
  // Invalid paths include:
  //   - .private//objects/venues/... (double slash and /objects/ segment)
  //   - .private/thumbnails/... (old thumbnail location)
  
  // Check for the correct pattern: .private/venues/{uuid}/...
  const validPattern = /^\.private\/venues\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;
  return validPattern.test(objectName);
}

async function listAllObjects(bucketName: string): Promise<{ name: string }[]> {
  const bucket = storage.bucket(bucketName);
  const [files] = await bucket.getFiles({ prefix: '.private/' });
  
  // Just return file names - metadata fetch is too slow for large buckets
  return files.map(file => ({ name: file.name }));
}

async function deleteObject(bucketName: string, objectName: string): Promise<void> {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectName);
  await file.delete();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--delete');
  
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    console.error('DEFAULT_OBJECT_STORAGE_BUCKET_ID not set');
    process.exit(1);
  }
  
  console.log(`Bucket: ${bucketId}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (use --delete to actually delete)' : 'DELETE MODE'}\n`);
  
  console.log('Listing all objects in storage...\n');
  const allObjects = await listAllObjects(bucketId);
  
  console.log(`Total objects found: ${allObjects.length}\n`);
  
  const validObjects: typeof allObjects = [];
  const orphanedObjects: typeof allObjects = [];
  
  for (const obj of allObjects) {
    if (isValidVenuePath(obj.name)) {
      validObjects.push(obj);
    } else {
      orphanedObjects.push(obj);
    }
  }
  
  console.log(`Valid venue objects: ${validObjects.length}`);
  console.log(`Orphaned objects: ${orphanedObjects.length}\n`);
  
  if (orphanedObjects.length === 0) {
    console.log('No orphaned objects to clean up!');
    return;
  }
  
  console.log('=== ORPHANED OBJECTS ===\n');
  
  for (const obj of orphanedObjects) {
    console.log(`  ${obj.name}`);
  }
  
  console.log('');
  
  if (dryRun) {
    console.log('=== DRY RUN - No files deleted ===');
    console.log('Run with --delete flag to actually delete these files.');
  } else {
    console.log('=== DELETING ORPHANED OBJECTS ===\n');
    
    let deleted = 0;
    let failed = 0;
    
    for (const obj of orphanedObjects) {
      try {
        await deleteObject(bucketId, obj.name);
        console.log(`  Deleted: ${obj.name}`);
        deleted++;
      } catch (err) {
        console.error(`  Failed to delete ${obj.name}:`, err);
        failed++;
      }
    }
    
    console.log(`\nDeleted: ${deleted}, Failed: ${failed}`);
  }
}

main().catch(console.error);
