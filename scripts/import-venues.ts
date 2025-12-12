import { readFileSync } from "fs";
import { db } from "../server/db";
import { venues } from "../shared/schema";

interface NdjsonVenue {
  _id: string;
  title: string;
  address?: string;
  phoneNumber?: string;
  neighborhood?: string;
  capacity?: string;
  hideOnSite?: boolean;
  links?: Array<{ title: string; url: string }>;
  venueDescription?: Array<{
    children?: Array<{ text?: string }>;
  }>;
}

function parseAddress(address: string): {
  streetAddress1: string;
  city: string;
  state: string;
  zipCode: string;
} {
  // Format: "1 Rockefeller Plaza, New York, NY 10020"
  const parts = address.split(",").map((s) => s.trim());
  
  if (parts.length >= 3) {
    const streetAddress1 = parts[0];
    const city = parts[1];
    // Last part is "NY 10020" or similar
    const stateZip = parts[parts.length - 1].split(" ");
    const state = stateZip[0] || "";
    const zipCode = stateZip.slice(1).join(" ") || "";
    
    return { streetAddress1, city, state, zipCode };
  }
  
  return { streetAddress1: address, city: "", state: "", zipCode: "" };
}

function parseInstagramUsername(url: string): string {
  // https://www.instagram.com/lodinyc/ -> lodinyc
  const match = url.match(/instagram\.com\/([^\/\?]+)/i);
  return match ? match[1] : "";
}

function extractDescription(venueDescription: NdjsonVenue["venueDescription"]): string {
  if (!venueDescription) return "";
  
  return venueDescription
    .flatMap((block) => block.children?.map((child) => child.text || "") || [])
    .join(" ")
    .trim();
}

function extractWebsite(links: NdjsonVenue["links"]): string {
  if (!links) return "";
  const websiteLink = links.find((l) => l.title?.toLowerCase() === "website");
  return websiteLink?.url || "";
}

function extractInstagramAccount(links: NdjsonVenue["links"]): string {
  if (!links) return "";
  const instaLink = links.find((l) => l.title?.toLowerCase() === "instagram");
  return instaLink ? parseInstagramUsername(instaLink.url) : "";
}

async function importVenues(testMode: boolean = false, limit?: number) {
  const filePath = "attached_assets/venues_1765571623717.ndjson";
  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  
  let imported = 0;
  let skipped = 0;
  
  for (const line of lines) {
    if (limit && imported >= limit) break;
    
    const venue: NdjsonVenue = JSON.parse(line);
    
    // Skip venues with hideOnSite=true
    if (venue.hideOnSite === true) {
      console.log(`Skipping (hideOnSite): ${venue.title}`);
      skipped++;
      continue;
    }
    
    const addressParts = venue.address ? parseAddress(venue.address) : {
      streetAddress1: "",
      city: "",
      state: "",
      zipCode: "",
    };
    
    const venueData = {
      externalId: venue._id,
      name: venue.title,
      streetAddress1: addressParts.streetAddress1,
      city: addressParts.city,
      state: addressParts.state,
      zipCode: addressParts.zipCode,
      phone: venue.phoneNumber || "",
      longDescription: extractDescription(venue.venueDescription),
      capacity: venue.capacity || "",
      neighborhood: venue.neighborhood || "",
      website: extractWebsite(venue.links),
      instagramAccount: extractInstagramAccount(venue.links),
    };
    
    if (testMode) {
      console.log("TEST MODE - Would insert:", JSON.stringify(venueData, null, 2));
    } else {
      await db.insert(venues).values(venueData);
      console.log(`Imported: ${venue.title}`);
    }
    
    imported++;
  }
  
  console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}`);
}

// Parse args
const args = process.argv.slice(2);
const testMode = args.includes("--test");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;

importVenues(testMode, limit).catch(console.error);
