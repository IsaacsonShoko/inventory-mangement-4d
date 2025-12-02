/**
 * Fetch current database schema from Supabase
 * Run with: node scripts/fetch-schema.js
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

async function fetchTableSchema(tableName) {
  const query = `
    SELECT
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    // Try alternative method using PostgREST introspection
    const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=0`, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    });

    console.log(`Table ${tableName}: ${altResponse.ok ? 'EXISTS' : 'NOT FOUND'}`);
    return null;
  }

  return await response.json();
}

async function main() {
  const tables = [
    'user_profiles',
    'inventory_items',
    'point_of_presence',
    'unique_orders',
    'stock_order',
    'dispatch_log',
    'stock_levels',
    'stock_counts',
    'device_registry',
    'repair_tickets',
    'device_movements',
    'ingestion_batches',
    'documents'
  ];

  console.log('Fetching schema from live database...\n');

  for (const table of tables) {
    try {
      const schema = await fetchTableSchema(table);
      if (schema) {
        console.log(`\n=== ${table} ===`);
        console.log(JSON.stringify(schema, null, 2));
      }
    } catch (err) {
      console.error(`Error fetching ${table}:`, err.message);
    }
  }
}

main().catch(console.error);
