import * as fs from 'fs';
import { db } from '../server/db';
import { venues } from '../shared/schema';

const csvPath = 'attached_assets/COC_Sanity_Venues_Data_1_(2)_1765639253670.csv';

function parseAddress(address: string) {
  if (!address) return { streetAddress1: '', city: '', state: '', zipCode: '' };
  const parts = address.split(',').map(p => p.trim());
  const streetAddress1 = parts[0] || '';
  const lastPart = parts[parts.length - 1] || '';
  const lastWords = lastPart.split(' ').filter(Boolean);
  const zipCode = lastWords[lastWords.length - 1] || '';
  const state = lastWords[lastWords.length - 2] || '';
  const cityParts = parts.slice(1, -1);
  const cityFromLast = lastWords.slice(0, -2).join(' ');
  const city = [...cityParts, cityFromLast].filter(Boolean).join(', ').replace(/,\s*$/, '');
  return { streetAddress1, city, state, zipCode };
}

function parseCSV(content: string) {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
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
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => row[h] = values[idx] || '');
    rows.push(row);
  }
  return rows;
}

async function main() {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  console.log(`Found ${rows.length} venues to import`);
  
  let imported = 0;
  let failed = 0;
  
  for (const row of rows) {
    const addr = parseAddress(row.address);
    const venue = {
      externalId: row.external_id || null,
      name: row.name,
      neighborhood: row.neighborhood || null,
      streetAddress1: addr.streetAddress1 || null,
      city: addr.city || null,
      state: addr.state || null,
      zipCode: addr.zipCode || null,
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      instagramAccount: row.instagram_account || null,
      longDescription: row.long_description || null,
      isActive: row.is_active?.toUpperCase() !== 'FALSE',
    };
    try {
      await db.insert(venues).values(venue);
      console.log(`Imported: ${venue.name}`);
      imported++;
    } catch (e) {
      console.error(`Failed to import ${venue.name}:`, e);
      failed++;
    }
  }
  console.log(`\nImport complete! Imported: ${imported}, Failed: ${failed}`);
  process.exit(0);
}

main();
