require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function clearTables() {
  console.log('Clearing tables for fresh migration...');
  
  // Delete in reverse order of dependencies
  const tables = ['stock_counts', 'stock_levels', 'dispatch_log', 'stock_order', 'unique_orders', 'point_of_presence', 'inventory_items'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', 0);
    if (error) {
      console.log('  ' + table + ': ' + (error.message || 'error'));
    } else {
      console.log('  ' + table + ': cleared');
    }
  }
  console.log('Done!');
}

clearTables();
