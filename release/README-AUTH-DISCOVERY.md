# JaiyePass — authentication diagnostic and nationwide discovery

## Installation

Run from `C:\Users\David\Documents\JaiyePass`:

```powershell
Expand-Archive "$HOME\Downloads\JaiyePass-Auth-Discovery-Repair.zip" -DestinationPath (Get-Location).Path -Force
node .\release\diagnose-auth.mjs
```

Do **not** paste `.env.local` or credentials into chat. This script reports only pass/fail and HTTP status codes; it tests the actual Auth endpoints, not just the presence of variables. It does not create users or send email.

If any diagnostic is FAIL, check Supabase project Settings > API Keys. Copy the **anon (legacy) or publishable key** to `NEXT_PUBLIC_SUPABASE_ANON_KEY` and **service_role (legacy) or secret key** to `SUPABASE_SERVICE_ROLE_KEY`. Never expose the server key to the browser. Restart `npm run dev` after editing `.env.local`.

For signup confirmations and password resets, you must configure a working email provider (custom SMTP) if Supabase's default mail delivery cannot send to your recipients. Add these redirect destinations in Supabase Authentication > URL Configuration:
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/confirm`
- `https://jaiyepass.vercel.app/auth/callback`
- `https://jaiyepass.vercel.app/auth/confirm`

Run:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

Test `/login` with your known admin, `/signup` with a separate test email, and `/reset-password` after confirming SMTP. Read the VS Code terminal for `[JaiyePass Auth ...]` entries — they print only error codes and HTTP statuses.

## UX changes

The former placeholder "Tonight in Lagos / For the crew / Date night" cards are replaced by real nationwide filters: next seven days, free admission, and tickets below ₦10,000, plus live city quick-links. The `/collections` page now applies the actual filter to each result instead of showing unrelated events. There are no invented event counts or fake recommendations. All existing server-side ticket/payment and RLS flows are preserved.

## Important

This is a local overlay, not a Vercel deployment. Authentication cannot be verified without access to your local `.env.local`, credentials, SMTP configuration and browser session. If diagnostics pass but signup/reset fails, inspect your terminal's error codes and Supabase Auth logs. Do not expose secrets.
