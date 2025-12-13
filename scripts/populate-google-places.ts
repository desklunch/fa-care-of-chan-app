import { db } from '../server/db';
import { venues } from '../shared/schema';
import { eq, isNull } from 'drizzle-orm';
import * as fs from 'fs';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const skippedLogPath = 'scripts/skipped-google-places.log';

interface PlaceResult {
  placeId: string;
  name: string;
  streetAddress1: string;
  city: string;
  state: string;
  stateCode: string;
  zipCode: string;
  phone: string;
  website: string;
  editorialSummary: string;
}

async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.addressComponents",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.editorialSummary",
  ].join(",");

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "en",
        pageSize: 5,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Google Places API error:", errorData);
    throw new Error("Failed to fetch from Google Places API");
  }

  const data = await response.json();
  
  return (data.places || []).map((place: any) => {
    let streetNumber = "";
    let route = "";
    let city = "";
    let state = "";
    let stateCode = "";
    let zipCode = "";

    if (place.addressComponents) {
      for (const component of place.addressComponents) {
        const types = component.types || [];
        if (types.includes("street_number")) {
          streetNumber = component.longText || "";
        } else if (types.includes("route")) {
          route = component.longText || "";
        } else if (types.includes("locality")) {
          city = component.longText || "";
        } else if (types.includes("sublocality_level_1") && !city) {
          city = component.longText || "";
        } else if (types.includes("administrative_area_level_1")) {
          state = component.longText || "";
          stateCode = component.shortText || "";
        } else if (types.includes("postal_code")) {
          zipCode = component.longText || "";
        }
      }
    }

    const streetAddress1 = [streetNumber, route].filter(Boolean).join(" ");

    return {
      placeId: place.id || "",
      name: place.displayName?.text || "",
      streetAddress1,
      city,
      state,
      stateCode,
      zipCode,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
      website: place.websiteUri || "",
      editorialSummary: place.editorialSummary?.text || "",
    };
  });
}

async function main() {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error("GOOGLE_PLACES_API_KEY not set");
    process.exit(1);
  }

  const skippedVenues: string[] = [];
  
  // Get all venues without googlePlaceId
  const allVenues = await db.select().from(venues).where(isNull(venues.googlePlaceId));
  console.log(`Found ${allVenues.length} venues without Google Place ID`);
  
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const venue of allVenues) {
    if (!venue.name || !venue.city || !venue.state) {
      const msg = `${venue.name || 'Unknown'}: Missing name, city, or state`;
      console.log(`  SKIP: ${msg}`);
      skippedVenues.push(msg);
      skipped++;
      continue;
    }
    
    // Build search query: "Name" City, State
    const query = `"${venue.name}" ${venue.city}, ${venue.state}`;
    
    try {
      const results = await searchPlaces(query);
      
      if (results.length === 0) {
        const msg = `${venue.name}: No results found`;
        console.log(`  SKIP: ${msg}`);
        skippedVenues.push(msg);
        skipped++;
        continue;
      }
      
      if (results.length > 1) {
        const msg = `${venue.name}: ${results.length} results found - ${results.map(r => r.name).join(', ')}`;
        console.log(`  SKIP: ${msg}`);
        skippedVenues.push(msg);
        skipped++;
        continue;
      }
      
      // Exactly 1 result - update the venue
      const place = results[0];
      
      await db.update(venues)
        .set({
          googlePlaceId: place.placeId,
          streetAddress1: place.streetAddress1 || venue.streetAddress1,
          state: place.stateCode || venue.state,
          zipCode: place.zipCode || venue.zipCode,
          phone: place.phone || venue.phone,
          website: place.website || venue.website,
          shortDescription: place.editorialSummary || venue.shortDescription,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, venue.id));
      
      console.log(`  OK: ${venue.name} -> ${place.placeId}`);
      updated++;
      
      // Rate limiting - 100ms delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (e) {
      const msg = `${venue.name}: API error - ${e}`;
      console.log(`  FAIL: ${msg}`);
      skippedVenues.push(msg);
      failed++;
    }
  }
  
  // Write skipped venues log
  if (skippedVenues.length > 0) {
    fs.writeFileSync(skippedLogPath, skippedVenues.join('\n'), 'utf-8');
    console.log(`\nSkipped venues logged to: ${skippedLogPath}`);
  }
  
  console.log(`\n=== Complete ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
