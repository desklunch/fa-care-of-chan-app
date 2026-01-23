import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const OLD_BUCKET_ID = "replit-objstore-62c8b438-b199-4509-bf13-15ef94117184";
const NEW_BUCKET_ID = "replit-objstore-b1946b63-bf7e-401f-94ac-91f8b189950f";

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

async function listAllFiles(bucketName: string): Promise<string[]> {
  const bucket = storage.bucket(bucketName);
  const [files] = await bucket.getFiles();
  return files.map(f => f.name);
}

async function copyFile(fileName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sourceBucket = storage.bucket(OLD_BUCKET_ID);
    const destBucket = storage.bucket(NEW_BUCKET_ID);
    
    const sourceFile = sourceBucket.file(fileName);
    const destFile = destBucket.file(fileName);
    
    const [exists] = await destFile.exists();
    if (exists) {
      return { success: true };
    }
    
    const [contents] = await sourceFile.download();
    const [metadata] = await sourceFile.getMetadata();
    
    await destFile.save(contents, {
      contentType: metadata.contentType || "application/octet-stream",
      metadata: metadata.metadata || {},
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("=== Bucket Migration Script ===\n");
  console.log(`Source bucket: ${OLD_BUCKET_ID}`);
  console.log(`Target bucket: ${NEW_BUCKET_ID}\n`);
  
  console.log("Listing files in source bucket...");
  const files = await listAllFiles(OLD_BUCKET_ID);
  console.log(`Found ${files.length} files to migrate.\n`);
  
  if (files.length === 0) {
    console.log("No files to migrate. Done!");
    return;
  }
  
  console.log("Starting migration...\n");
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors: { file: string; error: string }[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const progress = `[${i + 1}/${files.length}]`;
    
    const result = await copyFile(fileName);
    
    if (result.success) {
      successCount++;
      console.log(`${progress} ✓ ${fileName}`);
    } else {
      errorCount++;
      errors.push({ file: fileName, error: result.error || "Unknown error" });
      console.log(`${progress} ✗ ${fileName} - ${result.error}`);
    }
  }
  
  console.log("\n=== Migration Complete ===");
  console.log(`Total files: ${files.length}`);
  console.log(`Successfully copied: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log("\nFiles with errors:");
    errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
  }
  
  console.log("\nVerifying target bucket...");
  const targetFiles = await listAllFiles(NEW_BUCKET_ID);
  console.log(`Target bucket now has ${targetFiles.length} files.`);
  
  if (targetFiles.length >= files.length) {
    console.log("\n✓ Migration verified successfully!");
  } else {
    console.log(`\n⚠ Warning: Target has fewer files than source (${targetFiles.length} vs ${files.length})`);
  }
}

main().catch(console.error);
