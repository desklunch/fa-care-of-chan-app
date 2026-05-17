-- Task #284: Structured address columns for contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_street1 text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_street2 text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_postal_code text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_country text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_place_id text;
