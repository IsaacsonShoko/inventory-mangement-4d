const fs = require('fs');
let content = fs.readFileSync('scripts/migrate-airtable-to-supabase.cjs', 'utf8');

// Add normalizer functions if not present
if (!content.includes('normalizeItemNature')) {
  const normalizers = `// Helper to normalize enum values to match Supabase schema
function normalizeItemNature(value) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'serialized' || normalized === 'serialised') {
    return 'Serialised';
  }
  if (normalized === 'non-serialized' || normalized === 'non-serialised') {
    return 'Non-serialised';
  }
  return value;
}

function normalizeBusinessLine(value) {
  if (!value) return null;
  const map = {
    'absa': 'Absa',
    'cash connect': 'Cash Connect',
    'vps': 'VPS',
    'modems': 'Modems',
    'accessories': 'Accessories',
    'sim management': 'Sim Management',
    'other': 'Other'
  };
  const key = value.toLowerCase();
  return map[key] || value;
}

`;
  content = content.replace('// Helper to insert in batches', normalizers + '// Helper to insert in batches');
}

// Also add normalizeBusinessLine if only normalizeItemNature was added
if (!content.includes('normalizeBusinessLine')) {
  const bizNormalizer = `
function normalizeBusinessLine(value) {
  if (!value) return null;
  const map = {
    'absa': 'Absa',
    'cash connect': 'Cash Connect',
    'vps': 'VPS',
    'modems': 'Modems',
    'accessories': 'Accessories',
    'sim management': 'Sim Management',
    'other': 'Other'
  };
  const key = value.toLowerCase();
  return map[key] || value;
}

`;
  content = content.replace('// Helper to insert in batches', bizNormalizer + '// Helper to insert in batches');
}

// Update item_nature fields to use normalizer
content = content.replace(/item_nature: record\.fields\['Item_Nature'\] \|\| null/g, "item_nature: normalizeItemNature(record.fields['Item_Nature'])");
content = content.replace(/item_nature: record\.fields\['Item Nature'\] \|\| null/g, "item_nature: normalizeItemNature(record.fields['Item Nature'])");

// Update item_category fields to use normalizer for business_line_enum
content = content.replace(/item_category: record\.fields\['Item_Category'\] \|\| null/g, "item_category: normalizeBusinessLine(record.fields['Item_Category'])");
content = content.replace(/item_category: record\.fields\['Item Category'\] \|\| null/g, "item_category: normalizeBusinessLine(record.fields['Item Category'])");

fs.writeFileSync('scripts/migrate-airtable-to-supabase.cjs', content);
console.log('Updated migration script with enum normalization');
