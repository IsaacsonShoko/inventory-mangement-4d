/**
 * Airtable to Supabase Migration Script
 *
 * This script migrates all data from Airtable to Supabase.
 *
 * Prerequisites:
 * 1. npm install airtable @supabase/supabase-js dotenv
 * 2. Create a .env file with your credentials (or use existing .env.local)
 *
 * Usage:
 * node scripts/migrate-airtable-to-supabase.js
 */

require('dotenv').config({ path: '.env.local' });

const Airtable = require('airtable');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const AIRTABLE_PAT = process.env.VITE_AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.VITE_AIRTABLE_BASE_ID;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Table IDs
const TABLE_IDS = {
  inventory: process.env.VITE_AIRTABLE_INVENTORY_TABLE_ID,
  pointOfPresence: process.env.VITE_AIRTABLE_POINT_OF_PRESENCE_TABLE_ID,
  uniqueOrders: process.env.VITE_AIRTABLE_UNIQUE_ORDERS_TABLE_ID,
  orders: process.env.VITE_AIRTABLE_ORDERS_TABLE_ID,
  dispatchLog: process.env.VITE_AIRTABLE_DISPATCH_LOG_TABLE_ID,
};

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

// Helper to insert in batches
async function insertBatch(table, records, batchSize = 100) {
  const results = [];
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { data, error } = await supabase.from(table).insert(batch).select();
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      throw error;
    }
    results.push(...(data || []));
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`);
  }
  return results;
}

// Migration functions for each table
async function migrateInventory() {
  console.log('\n📦 Migrating inventory_items...');
  const records = await fetchAllRecords(TABLE_IDS.inventory);
  console.log(`  Found ${records.length} records in Airtable`);

  const transformed = records.map(record => ({
    item_name: record.fields['Device Type'] || null,
    item_url: record.fields['Item_Url'] || record.fields['Item Url'] || null,
    item_category: record.fields['Item_Category'] || null,
    item_description: record.fields['Item_Description'] || null,
    item_nature: record.fields['Item_Nature'] || null,
  }));

  const inserted = await insertBatch('inventory_items', transformed);
  console.log(`  ✅ Migrated ${inserted.length} inventory items`);
  return inserted;
}

async function migratePointOfPresence() {
  console.log('\n👷 Migrating point_of_presence...');
  const records = await fetchAllRecords(TABLE_IDS.pointOfPresence);
  console.log(`  Found ${records.length} records in Airtable`);

  const transformed = records.map(record => ({
    tech_id: record.fields['Tech ID'] || null,
    name_surname: record.fields['Name & Surname'] || 'Unknown',
    contractor: record.fields['Contractor'] || null,
    region: record.fields['Region'] || null,
    email_address: record.fields['Email Address'] || null,
    contact_number: record.fields['Contact Number'] || null,
    mobile: record.fields['Mobile'] || null,
    area_based: record.fields['Area Based'] || null,
    location_code: record.fields['Location Code'] || null,
    physical_address: record.fields['Physical Address'] || null,
    latitude: record.fields['Latitude'] || null,
    longitude: record.fields['Longitude'] || null,
    tech_id_no: record.fields['Tech ID No'] || null,
    mie_date: record.fields['MIE Date'] || null,
    absa_bin_created_date: record.fields['ABSA BIN Created Date'] || null,
    absa_xlink_pop: record.fields['ABSA Xlink POP'] || null,
    absa_training_completed: record.fields['ABSA Training Completed'] || null,
    ad: record.fields['AD'] || null,
    systems: record.fields['Systems'] || null,
    wiki_updated: record.fields['Wiki Updated'] || null,
    poly_graph_date: record.fields['Poly Graph Date'] || null,
    cc_training_start_date: record.fields['CC Training Start Date'] || null,
    cc_training_end_date: record.fields['CC Training End Date'] || null,
    cc_ride_along_completed: record.fields['CC Ride Along Completed'] || null,
    mrm: record.fields['MRM'] || null,
    sap: record.fields['SAP'] || null,
    safe_control_skipper_app: record.fields['Safe Control Skipper App'] || null,
  }));

  const inserted = await insertBatch('point_of_presence', transformed);
  console.log(`  ✅ Migrated ${inserted.length} technicians`);
  return inserted;
}

async function migrateUniqueOrders() {
  console.log('\n📋 Migrating unique_orders...');
  const records = await fetchAllRecords(TABLE_IDS.uniqueOrders);
  console.log(`  Found ${records.length} records in Airtable`);

  // Create a map of Airtable record ID to Supabase ID
  const orderIdMap = new Map();

  const transformed = records.map(record => {
    const orderId = record.fields['Order ID'];
    return {
      // Note: order_id is auto-generated, but we need to track original
      _airtable_id: record.id,
      _airtable_order_id: orderId,
      date_ordered: record.fields['Date Ordered'] || new Date().toISOString(),
      item_category: record.fields['Item Category'] || null,
      item_nature: record.fields['Item Nature'] || null,
      quantity_ordered: record.fields['Quantity Ordered'] || null,
      region: record.fields['Region'] || null,
      contractor_company: record.fields['Contractor Company'] || null,
      technician: record.fields['Technician'] || null,
      ordered_by: record.fields['Ordered by'] || 'unknown@example.com',
      deliver_to_part: record.fields['Deliver to Part'] || null,
      on_behalf_of: record.fields['On Behalf of'] || null,
      pop_id: record.fields['PoPID'] ? String(record.fields['PoPID']) : null,
      order_location: record.fields['Order Location'] || null,
      warehouse_fulfilling: record.fields['Warehouse Fulfilling'] || null,
      recipient_name: record.fields['Recipient Name'] || null,
      recipient_company_name: record.fields['Recipient Company Name'] || null,
      recipient_address: record.fields['Recipient Address'] || null,
      recipient_contact_number: record.fields['Recipient Contact Number'] || null,
      recipient_email_address: record.fields['Recipient Email Address'] || null,
      cell_phone_number: record.fields['CellPhone Number'] || null,
      dispatch_status: record.fields['Dispatch Status'] || 'Pending',
      stock_availability: record.fields['Stock Availability'] || null,
      pick_status: record.fields['Pick Status'] || 'Pending',
      dispatch_method: record.fields['Dispatch Method'] || null,
      waybill_number: record.fields['WayBill Number'] || null,
      order_notes: record.fields['Order Notes'] || null,
      order_summary_ai: record.fields['Order Summary (AI Generated)'] || null,
    };
  });

  // Insert without the tracking fields
  const toInsert = transformed.map(({ _airtable_id, _airtable_order_id, ...rest }) => rest);

  // Insert one by one to track ID mapping
  const inserted = [];
  for (let i = 0; i < toInsert.length; i++) {
    const { data, error } = await supabase
      .from('unique_orders')
      .insert(toInsert[i])
      .select()
      .single();

    if (error) {
      console.error(`Error inserting order ${i + 1}:`, error);
      continue;
    }

    if (data) {
      inserted.push(data);
      orderIdMap.set(transformed[i]._airtable_id, {
        id: data.id,
        order_id: data.order_id
      });
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  Inserted ${i + 1}/${toInsert.length} orders`);
    }
  }

  console.log(`  ✅ Migrated ${inserted.length} unique orders`);
  return { inserted, orderIdMap };
}

async function migrateStockOrders(orderIdMap) {
  console.log('\n📦 Migrating stock_order...');
  const records = await fetchAllRecords(TABLE_IDS.orders);
  console.log(`  Found ${records.length} records in Airtable`);

  const transformed = records.map(record => {
    // Try to find the matching unique order
    const orderIdField = record.fields['Order Id'];
    let orderId = null;
    let uniqueOrderRecordId = null;

    // Order Id could be a linked record array or a number
    if (Array.isArray(orderIdField) && orderIdField.length > 0) {
      const mapping = orderIdMap.get(orderIdField[0]);
      if (mapping) {
        orderId = mapping.order_id;
        uniqueOrderRecordId = mapping.id;
      }
    } else if (typeof orderIdField === 'number') {
      // Find by order number
      for (const [, mapping] of orderIdMap) {
        if (mapping.order_id === orderIdField) {
          orderId = mapping.order_id;
          uniqueOrderRecordId = mapping.id;
          break;
        }
      }
    }

    return {
      order_id: orderId || 1, // Default to 1 if not found
      unique_order_record_id: uniqueOrderRecordId || 1,
      device_type: record.fields['Device Type'] || 'Unknown',
      date_ordered: record.fields['Date Ordered'] || null,
      quantity_ordered: record.fields['Quantity ordered'] || 1,
      qty_dispatched: record.fields['QTY dispatched'] || 0,
      item_category: record.fields['Item Category'] || null,
      item_description: record.fields['Item Description'] || null,
      item_nature: record.fields['Item Nature'] || null,
      contractor_company: record.fields['Contractor Company'] || null,
      region: record.fields['Region'] || null,
      technician: record.fields['Technician'] || null,
      ordered_by: record.fields['Ordered by'] || null,
      order_location: record.fields['Order Location'] || null,
      dispatch_to: record.fields['Dispatch to'] || null,
      warehouse_fulfilling: record.fields['Warehouse Fulfilling'] || null,
      tech_email: record.fields['Tech Email'] || null,
      pick_status: record.fields['Pick Status'] || 'Pending',
      dispatch_status: record.fields['Dispatch Status'] || 'Pending',
      dispatch_or_order: record.fields['Dispatch / order'] || null,
      waybill_number: record.fields['Waybill number'] || null,
    };
  });

  // Filter out records without valid order references
  const validRecords = transformed.filter(r => r.order_id && r.unique_order_record_id);
  console.log(`  ${validRecords.length} records have valid order references`);

  if (validRecords.length > 0) {
    const inserted = await insertBatch('stock_order', validRecords);
    console.log(`  ✅ Migrated ${inserted.length} stock orders`);
    return inserted;
  }

  console.log('  ⚠️ No valid stock orders to migrate');
  return [];
}

async function migrateDispatchLog(orderIdMap) {
  console.log('\n🚚 Migrating dispatch_log...');
  const records = await fetchAllRecords(TABLE_IDS.dispatchLog);
  console.log(`  Found ${records.length} records in Airtable`);

  const transformed = records.map(record => {
    // Try to find the matching unique order
    const orderIdField = record.fields['Order Id'];
    let orderId = null;
    let uniqueOrderRecordId = null;

    if (Array.isArray(orderIdField) && orderIdField.length > 0) {
      const mapping = orderIdMap.get(orderIdField[0]);
      if (mapping) {
        orderId = mapping.order_id;
        uniqueOrderRecordId = mapping.id;
      }
    }

    return {
      order_id: orderId,
      unique_order_record_id: uniqueOrderRecordId,
      stock_order_id: null, // Would need stock order mapping
      date_dispatched: record.fields['Date Dispatched'] || new Date().toISOString().split('T')[0],
      item_category: record.fields['Item Category'] || null,
      item_nature: record.fields['Item Nature'] || null,
      item_description: record.fields['Item Description'] || null,
      device_type: record.fields['Device type'] || null,
      quantity: record.fields['Quantity'] || null,
      contractor_company: record.fields['Contractor Company'] || null,
      region: record.fields['Region'] || null,
      technician: record.fields['Technician'] || null,
      warehouse_fulfilling: record.fields['Warehouse Fulfilling'] || null,
      terminal_serial_number: record.fields['Terminal Serial Number'] || null,
      cradle_serial_number: record.fields['Cradle Serial Number'] || null,
      charger_serial_number: record.fields['Charger Serial Number'] || null,
      cashconnect_serial_number: record.fields['CashConnect Serial Number'] || null,
      charger_packed: record.fields['Charger Packed'] || null,
      cables: record.fields['Cables'] || null,
      packer: record.fields['Packer'] || null,
      dispatcher: record.fields['Dispatcher'] || null,
      dispatch_method: record.fields['Dispatch Method'] || null,
      waybill_number: record.fields['Waybill number'] || null,
      package_reference: record.fields['Package Reference'] || null,
      stock_availability: record.fields['Stock Availability'] || null,
      pick_status: record.fields['Pick Status'] || null,
      shipped: record.fields['Shipped'] === 'Yes' || record.fields['Shipped'] === true,
    };
  });

  const inserted = await insertBatch('dispatch_log', transformed);
  console.log(`  ✅ Migrated ${inserted.length} dispatch logs`);
  return inserted;
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting Airtable to Supabase Migration\n');
  console.log('Configuration:');
  console.log(`  Airtable Base: ${AIRTABLE_BASE_ID}`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log('');

  // Validate configuration
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    console.error('❌ Missing Airtable credentials');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  try {
    // Migrate in order due to foreign key dependencies
    await migrateInventory();
    await migratePointOfPresence();
    const { orderIdMap } = await migrateUniqueOrders();
    await migrateStockOrders(orderIdMap);
    await migrateDispatchLog(orderIdMap);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
