#!/usr/bin/env node
// Safe configuration check: prints variable names, never values.
const { randomBytes } = require('node:crypto');
const vars = [
  ['NEXT_PUBLIC_SUPABASE_URL', 'required', 'Supabase integration'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'required', 'Supabase integration'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'required', 'Supabase integration, server only'],
  ['TICKET_TOKEN_PEPPER', 'required', 'Generate a strong independent secret; server only'],
  ['NEXT_PUBLIC_APP_URL', 'required', 'Expected: https://jaiyepass.vercel.app'],
  ['PAYSTACK_SECRET_KEY', 'optional', 'Use test key only until launch approval'],
  ['RESEND_API_KEY', 'optional', 'Needed to send real transactional emails'],
];
let requiredMissing = 0;
for (const [key,priority,note] of vars) {
  const present = Boolean(process.env[key]);
  if (!present && priority === 'required') requiredMissing++;
  console.log(`${present ? 'OK' : 'MISSING'} ${key} (${priority}): ${note}`);
}
if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'https://jaiyepass.vercel.app') {
  console.warn('WARNING: NEXT_PUBLIC_APP_URL differs from the current production URL');
}
if (process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_live_')) {
  console.error('BLOCKED: live Paystack key detected before approved launch');
  process.exitCode = 1;
}
if (requiredMissing) process.exitCode = 1;
console.log(`Required variables missing: ${requiredMissing}`);
