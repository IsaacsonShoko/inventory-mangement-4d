const fs = require('fs');

// Read existing types.ts with UTF-16LE encoding
const typesPath = 'c:/Users/4D/inventory-mangement-4d/src/integrations/supabase/types.ts';
let content = fs.readFileSync(typesPath, 'utf16le');

// Check which tables are missing
const missingTables = [
  'stock_levels',
  'stock_counts',
  'device_registry',
  'repair_tickets',
  'device_movements',
  'ingestion_batches',
  'bot_usage_logs',
  'user_profiles'
];

const tablesPresent = missingTables.filter(table => content.includes(`${table}:`));
const tablesActuallyMissing = missingTables.filter(table => !content.includes(`${table}:`));

console.log('Tables already present:', tablesPresent);
console.log('Tables actually missing:', tablesActuallyMissing);

if (tablesActuallyMissing.length === 0) {
  console.log('All tables already present in types.ts');
  process.exit(0);
}

// Read the additions file
const additionsPath = 'c:/Users/4D/inventory-mangement-4d/src/integrations/supabase/types-additions.txt';
const additions = fs.readFileSync(additionsPath, 'utf8');

// Find where to insert - look for the Tables closing section
// The pattern should be right before "    }\n    Views:" or "    }\n    Enums:"
const insertPattern = /(\s+)\}\s+Views:/;
const match = content.match(insertPattern);

if (!match) {
  console.error('Could not find insertion point in types.ts');
  console.error('Looking for pattern: "    }\\n    Views:"');

  // Try alternate pattern
  const altPattern = /(\s+)\}\s+Enums:/;
  const altMatch = content.match(altPattern);

  if (!altMatch) {
    console.error('Could not find alternate pattern either');
    process.exit(1);
  }

  content = content.replace(altPattern, `\n${additions}\n$&`);
  console.log('Inserted using alternate pattern (before Enums)');
} else {
  content = content.replace(insertPattern, `\n${additions}\n$&`);
  console.log('Inserted before Views section');
}

// Write back as UTF-8
fs.writeFileSync(typesPath, content, 'utf8');
console.log('Successfully updated types.ts with UTF-8 encoding');
console.log('Added tables:', tablesActuallyMissing.join(', '));
