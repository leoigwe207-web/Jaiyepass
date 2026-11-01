JaiyePass checkout 404 repair

Confirmed issue: the checkout page's Supabase relationship embed `hold:inventory_holds(expires_at, status)` is ambiguous, because the orders and inventory_holds tables have two FK relationships. PostgREST requires `!orders_hold_id_fkey`.

Use: powershell -ExecutionPolicy Bypass -File .\release\checkout-404-fix\apply.ps1

The installer changes only that query string, backs up the old file, and does not change any database rows, credentials or configuration.

After applying, run:
  npm.cmd run typecheck
  npm.cmd run build
  npm.cmd run dev

Test a fresh ticket order while logged in; past reservations last only about ten minutes. If checkout still fails, copy the dev-server error code and the browser's full localhost URL, but never share API keys or cookies.
