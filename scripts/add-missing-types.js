const fs = require('fs');
const path = require('path');

// Read the types file with UTF-16LE encoding
const typesPath = 'c:/Users/4D/inventory-mangement-4d/src/integrations/supabase/types.ts';
let content = fs.readFileSync(typesPath, 'utf16le');

// Read the additions file
const additionsPath = 'c:/Users/4D/inventory-mangement-4d/src/integrations/supabase/types-additions.txt';
const additions = fs.readFileSync(additionsPath, 'utf8');

// Find the Tables section and insert before the closing braces
// Look for the pattern "      }\n    }\n    Views:" or similar end of Tables section
const tablesEndPattern = /(\s+}\s+}\s+Views:)/;

if (tablesEndPattern.test(content)) {
  // Insert the new table definitions before the end of Tables section
  content = content.replace(tablesEndPattern, `\n${additions}\n$1`);
  console.log('Added missing table definitions');
} else {
  console.error('Could not find Tables section end pattern');
  process.exit(1);
}

// Write back as UTF-8
fs.writeFileSync(typesPath, content, 'utf8');
console.log('Successfully updated types.ts with UTF-8 encoding');
