/**
 * Point of Presence Delete and Insert Script
 *
 * This script:
 * 1. Deletes all existing data from point_of_presence table
 * 2. Inserts sample/test data
 *
 * Prerequisites:
 * 1. npm install @supabase/supabase-js dotenv
 * 2. Ensure .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 * node scripts/delete-and-insert-point-of-presence.cjs
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sample data to insert
const sampleData = [
  {
    tech_id: '100',
    name_surname: 'Isaacson Shoko',
    contractor: '4D Analytics',
    region: 'Gauteng',
    email_address: 'shokoisaac@gmail.com',
    contact_number: null,
    mobile: '826769806',
    area_based: 'Sunninghill',
    location_code: '4DAISH',
    physical_address: '103 Leeuwkop road',
    latitude: 0,
    longitude: 0,
    tech_id_no: '100',
    mie_date: null,
    absa_bin_created_date: null,
    absa_xlink_pop: '',
    absa_training_completed: '',
    ad: '',
    systems: '',
    wiki_updated: '',
    poly_graph_date: null,
    cc_training_start_date: null,
    cc_training_end_date: null,
    cc_ride_along_completed: '',
    mrm: '',
    sap: '',
    safe_control_skipper_app: '',
  }
];

// Main function
async function deleteAndInsert() {
  console.log('\n🚀 Starting Point of Presence delete and insert...\n');

  try {
    // Step 1: Delete all existing records
    console.log('🗑️  Step 1: Deleting all records from point_of_presence...');

    // First, get count of records
    const { count: beforeCount, error: countError } = await supabase
      .from('point_of_presence')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting records:', countError.message);
    } else {
      console.log(`   Found ${beforeCount} existing records`);
    }

    // Delete all records using a range delete (more reliable than neq)
    const { error: deleteError } = await supabase
      .from('point_of_presence')
      .delete()
      .gte('id', 0); // Delete all records with id >= 0 (which is all records)

    if (deleteError) {
      console.error('❌ Error deleting records:', deleteError.message);
      throw deleteError;
    }

    console.log(`✅ Successfully deleted all records\n`);

    // Step 2: Insert new data
    console.log(`📥 Step 2: Inserting ${sampleData.length} new record(s)...`);

    const { data, error: insertError } = await supabase
      .from('point_of_presence')
      .insert(sampleData)
      .select();

    if (insertError) {
      console.error('❌ Error inserting records:', insertError.message);
      console.error('Details:', insertError);
      throw insertError;
    }

    console.log(`✅ Successfully inserted ${data.length} record(s)`);

    // Step 3: Verify the insert
    console.log('\n🔍 Step 3: Verifying insertion...');
    const { count: afterCount, error: verifyError } = await supabase
      .from('point_of_presence')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError.message);
    } else {
      console.log(`✅ Verification: ${afterCount} record(s) now in table`);
    }

    console.log('\n✅ Operation complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Records before: ${beforeCount || 0}`);
    console.log(`   - Records inserted: ${data.length}`);
    console.log(`   - Records after: ${afterCount || 0}`);

  } catch (error) {
    console.error('\n❌ Operation failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the operation
deleteAndInsert()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
