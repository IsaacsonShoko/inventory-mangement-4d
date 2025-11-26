/**
 * Point of Presence Refresh Script
 *
 * This script:
 * 1. Deletes all existing data from point_of_presence table
 * 2. Fetches fresh data from Airtable
 * 3. Inserts the data into Supabase
 *
 * Prerequisites:
 * 1. npm install airtable @supabase/supabase-js dotenv
 * 2. Ensure .env.local has all required credentials
 *
 * Usage:
 * node scripts/refresh-point-of-presence.cjs
 */

require('dotenv').config({ path: '.env.local' });

const Airtable = require('airtable');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const AIRTABLE_PAT = process.env.VITE_AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.VITE_AIRTABLE_BASE_ID;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const POINT_OF_PRESENCE_TABLE_ID = process.env.VITE_AIRTABLE_POINT_OF_PRESENCE_TABLE_ID;

// Validate configuration
if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !SUPABASE_URL || !SUPABASE_KEY || !POINT_OF_PRESENCE_TABLE_ID) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_AIRTABLE_PAT, VITE_AIRTABLE_BASE_ID, VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY, VITE_AIRTABLE_POINT_OF_PRESENCE_TABLE_ID');
  process.exit(1);
}

// Initialize clients
const airtable = new Airtable({ apiKey: AIRTABLE_PAT });
const base = airtable.base(AIRTABLE_BASE_ID);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to fetch all records from Airtable
async function fetchAllRecords(tableId) {
  const records = [];
  await base(tableId)
    .select()
    .eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords);
      fetchNextPage();
    });
  return records;
}

// Helper to insert records in batches
async function insertInBatches(tableName, records, batchSize = 100) {
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert(batch);

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
      }
    } catch (err) {
      console.error(`❌ Exception inserting batch ${Math.floor(i / batchSize) + 1}:`, err.message);
      failed += batch.length;
    }
  }

  return { inserted, failed };
}

// Main migration function
async function refreshPointOfPresence() {
  console.log('\n🚀 Starting Point of Presence refresh...\n');

  try {
    // Step 1: Delete all existing records
    console.log('🗑️  Step 1: Deleting existing records from point_of_presence...');
    const { error: deleteError, count: deletedCount } = await supabase
      .from('point_of_presence')
      .delete()
      .neq('id', 0); // Delete all records (neq with impossible condition)

    if (deleteError) {
      console.error('❌ Error deleting records:', deleteError.message);
      throw deleteError;
    }
    console.log(`✅ Deleted all existing records\n`);

    // Step 2: Fetch data from Airtable
    console.log('📥 Step 2: Fetching Point of Presence data from Airtable...');
    const airtableRecords = await fetchAllRecords(POINT_OF_PRESENCE_TABLE_ID);
    console.log(`✅ Fetched ${airtableRecords.length} records from Airtable\n`);

    if (airtableRecords.length === 0) {
      console.log('⚠️  No records found in Airtable. Exiting.');
      return;
    }

    // Step 3: Transform and insert data
    console.log('🔄 Step 3: Transforming and inserting data into Supabase...');

    const transformedRecords = airtableRecords.map(record => {
      const fields = record.fields;

      return {
        tech_id: fields['Tech ID'] || null,
        name_surname: fields['Name & Surname'] || fields['TechName'] || 'Unknown',
        contractor: fields['Contractor'] || null,
        region: fields['Region'] || null,
        email_address: fields['Email Address'] || null,
        contact_number: fields['Contact Number'] || null,
        mobile: fields['Mobile'] || null,
        area_based: fields['Area Based'] || null,
        location_code: fields['Location Code'] || null,
        physical_address: fields['Physical Address'] || null,
        latitude: parseFloat(fields['Latitude']) || null,
        longitude: parseFloat(fields['Longitude']) || null,
        tech_id_no: fields['Tech id No'] || null,
        mie_date: fields['Mie Date'] || null,
        absa_bin_created_date: fields['Absa Bin Created Date'] || null,
        absa_xlink_pop: fields['Absa Xlink POP'] || null,
        absa_training_completed: fields['Absa Training Completed'] || null,
        ad: fields['AD'] || null,
        systems: fields['Sytems'] || fields['Systems'] || null,
        wiki_updated: fields['Wiki Upated'] || fields['Wiki Updated'] || null,
        poly_graph_date: fields['Poly Graph Date'] || null,
        cc_training_start_date: fields['CC Training Start Date'] || null,
        cc_training_end_date: fields['CC Training End Date'] || null,
        cc_ride_along_completed: fields['CC Ride along Completed'] || null,
        mrm: fields['MRM'] || null,
        sap: fields['SAP'] || null,
        safe_control_skipper_app: fields['Safe Control and Skipper App'] || null,
      };
    });

    const { inserted, failed } = await insertInBatches('point_of_presence', transformedRecords);

    console.log('\n✅ Migration complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Fetched from Airtable: ${airtableRecords.length}`);
    console.log(`   - Successfully inserted: ${inserted}`);
    console.log(`   - Failed: ${failed}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
refreshPointOfPresence()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
