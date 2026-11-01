# JaiyePass — role-aware login and session repair

This patch contains five source files for Next.js 15. It does not include credentials or database migrations.

1. Sign in with a verified Supabase account. If no destination was requested, admin users go to `/admin`; attendees go to `/account/tickets`.
2. Explicit `?next=/...` destinations are preserved when safe; a non-admin account attempting `/admin` gets a clear error instead of silently returning home.
3. The user's role is read on the SERVER ONLY after `auth.getUser()` has verified their session. Admin lookups are restricted to the verified ID, not browser inputs; existing RLS and guards remain in place.
4. Next.js 15 middleware refreshes Supabase session cookies. This is not an access-control substitute.
5. `/access-denied` explains the missing admin role and offers sign-out.

## Apply (Windows PowerShell)

Stop `npm run dev` with Ctrl+C. From `C:\Users\David\Documents\JaiyePass`:

```powershell
Expand-Archive "$HOME\Downloads\JaiyePass-Login-Redirect-Fix.zip" -DestinationPath (Get-Location).Path -Force
node .\release\diagnose-auth.mjs
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
npm.cmd run dev
```

Do not proceed if the public Auth API diagnostic fails with 401. Restart Next.js after editing `.env.local`.
Use an incognito window if earlier attempts left mixed auth cookies.

## Verify

- `http://localhost:3000/login`: admin sign-in -> `/admin`.
- Sign out, attendee sign-in -> `/account/tickets`.
- `http://localhost:3000/admin`: logged out -> `/login?next=/admin`; authenticated non-admin -> `/access-denied`.
- After signing in, hard-refresh a protected route; it should remain accessible.
- No keys or passwords should appear in browser logs.

If the app returns to `/login`, share only the sanitized server terminal error and URL; do not share `.env.local` or private tokens.
