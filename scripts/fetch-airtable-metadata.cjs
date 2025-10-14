const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env file at', envPath);
  process.exit(1);
}

const env = {};
for (const rawLine of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
  if (!rawLine) continue;
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const eqIndex = line.indexOf('=');
  if (eqIndex === -1) continue;
  const key = line.slice(0, eqIndex).trim();
  let value = line.slice(eqIndex + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const baseId = env.VITE_AIRTABLE_BASE_ID;
const pat = env.VITE_AIRTABLE_PAT;

if (!baseId || !pat) {
  console.error('Missing required env keys', { hasBaseId: !!baseId, hasPat: !!pat });
  process.exit(1);
}

const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;

fetch(url, {
  headers: {
    Authorization: `Bearer ${pat}`,
  },
}).then(async (res) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}).then((json) => {
  console.log(JSON.stringify(json, null, 2));
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
