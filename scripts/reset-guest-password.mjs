import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.argv[2] || 'guest@4danalytics.co.za';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const password =
  'Guest-' + randomBytes(6).toString('base64url').replace(/[-_]/g, '') + '-2026!';

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers });
if (!listRes.ok) {
  console.error('Failed to list users:', listRes.status, await listRes.text());
  process.exit(1);
}

const list = await listRes.json();
const user = (list.users || []).find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());

if (!user) {
  console.error(`User ${EMAIL} not found among ${list.users?.length ?? 0} users.`);
  process.exit(1);
}

console.log(`Found user: ${user.email} (${user.id})`);

const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
  method: 'PUT',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ password }),
});

if (!updateRes.ok) {
  console.error('Password update failed:', updateRes.status, await updateRes.text());
  process.exit(1);
}

console.log('\n✅ Password updated successfully');
console.log('Email:    ', EMAIL);
console.log('Password: ', password);
console.log('\nAdd these to Netlify env vars:');
console.log(`  VITE_GUEST_EMAIL=${EMAIL}`);
console.log(`  VITE_GUEST_PASSWORD=${password}`);
