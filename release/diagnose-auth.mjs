/** Safe local diagnostic: prints status and advice, NEVER keys, emails, or tokens. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const location = resolve(process.cwd(), '.env.local');
if (!existsSync(location)) { console.error('MISSING .env.local — run release/setup-local-auth.ps1'); process.exit(1); }
const config = Object.fromEntries(readFileSync(location, 'utf8').split(/\r?\n/).flatMap(line => {
  const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (!m) return [];
  const value = m[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  return [[m[1], value]];
}));
let failure = false;
function status(ok, label, detail = '') { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ' — ' + detail : ''}`); if (!ok) failure = true; }
const url = config.NEXT_PUBLIC_SUPABASE_URL || '';
const publicKey = config.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY || '';
status(/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url), 'Supabase project URL format');
status(url === 'https://zaowgedkxfghcjocvlbz.supabase.co', 'Correct JaiyePass Supabase project URL');
status(publicKey.length > 30, 'Public/anon key present');
status(serviceKey.length > 30, 'Server-only service role key present');
status((config.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') === 'http://localhost:3000', 'Local app URL');
function jwtRole(key) {
  if (!key.startsWith('eyJ')) return '';
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role || ''; } catch { return 'invalid'; }
}
if (publicKey) status(publicKey.startsWith('sb_publishable_') || jwtRole(publicKey) === 'anon', 'Public key is publishable/anon');
if (serviceKey) status(serviceKey.startsWith('sb_secret_') || jwtRole(serviceKey) === 'service_role', 'Service key is secret/service_role');
async function endpoint(label, path, key) {
  try {
    const response = await fetch(url + path, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(9000) });
    status(response.ok, label, `HTTP ${response.status}`);
    if (response.status === 401 || response.status === 403) console.log('  Check this key was copied from the correct Supabase project.');
  } catch { status(false, label, 'Could not reach the project; check network, URL and DNS'); }
}
if (/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && publicKey.length > 30) await endpoint('Public Auth API connection', '/auth/v1/settings', publicKey);
if (/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && serviceKey.length > 30) await endpoint('Server admin API access', '/auth/v1/admin/users?per_page=1', serviceKey);
console.log('If both APIs pass but email fails, check Supabase Auth > SMTP Settings and Auth > URL Configuration.');
console.log('Never send .env.local or API key values.');
process.exitCode = failure ? 1 : 0;
