# JaiyePass V2 — Vercel/Supabase integration verified

2026-10-26: Vercel project `jaiyepass` (team `TOPDON`) has these **production** environment variable *names* synchronized: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and alternative publishable/secret keys. Credential values were not displayed.

## Still required

1. Complete baseline Supabase migrations `0001`–`0007` in sequence; verify permission model and security advisors. The `jaiyepass` database had zero public tables and recorded migrations at last check. Keep payment and QR routes inactive until migrations pass end-to-end tests.
2. Set `TICKET_TOKEN_PEPPER` to a cryptographically random secret (32+ bytes), separate from any Supabase credentials; configure it using Vercel's protected environment variable UI. Do not paste it in chat, commit it, or change it casually after real tickets are issued.
3. Set `NEXT_PUBLIC_APP_URL` to `https://jaiyepass.vercel.app` for production.
4. Add Paystack **test** credentials and approved email provider only after wiring/test validation; no live keys before explicit approval.
5. Existing integration synchronized variables to `production` only. For preview deployments, enable appropriate **preview** variables without reusing live payment secrets.
6. Run `npm ci`, `npm run check:env`, `npm run typecheck`, `npm test`, `npm run build`, and `node scripts/smoke-v2.cjs` before release.

**State:** configuration guide only. No database migration, payment, or deployment is implied by this file.
