const fs = require('fs');
let content = fs.readFileSync('scripts/migrate-airtable-to-supabase.cjs', 'utf8');

// Add dispatch method normalizer if not present
if (!content.includes('normalizeDispatchMethod')) {
  const normalizer = `
function normalizeDispatchMethod(value) {
  if (!value) return null;
  const map = {
    'courier': 'Courier',
    'collection': 'Pickup',
    'delivery': 'In-house Delivery',
    'in-house delivery': 'In-house Delivery',
    'pickup': 'Pickup',
    'other': 'Other'
  };
  const key = value.toLowerCase();
  return map[key] || 'Other';
}

`;
  content = content.replace('// Helper to insert in batches', normalizer + '// Helper to insert in batches');
}

// Update dispatch_method fields
content = content.replace(/dispatch_method: record\.fields\['Dispatch Method'\] \|\| null/g, "dispatch_method: normalizeDispatchMethod(record.fields['Dispatch Method'])");

fs.writeFileSync('scripts/migrate-airtable-to-supabase.cjs', content);
console.log('Added dispatch method normalization');
