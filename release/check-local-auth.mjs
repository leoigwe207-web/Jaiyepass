import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
// Never print secret values; do not commit .env.local.
const file = resolve(process.cwd(),'.env.local');
if (!existsSync(file)) { console.error('Missing .env.local. Run release/setup-local-auth.ps1'); process.exitCode=1; }
else {
  const values=Object.fromEntries(readFileSync(file,'utf8').split(/\r?\n/).filter(x=>/^\s*[A-Z_]+\s*=/.test(x)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i).trim(),line.slice(i+1).trim()]}));
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_APP_URL']) {
    const ok=!!values[k]; console.log(`${ok?'OK':'MISSING'} ${k}`); if (!ok) process.exitCode=1;
  }
  if (!/localhost:3000/.test(values.NEXT_PUBLIC_APP_URL||'')) console.log('NOTE: For local auth links, use NEXT_PUBLIC_APP_URL=http://localhost:3000');
}
