# JaiyePass — Financial Safety Stage 1 Patch

This patch is intended for the **actual local JaiyePass** project at `C:\Users\David\Documents\JaiyePass`.
It does NOT deploy or change Supabase automatically. Review all changes before production.

## Installation (VS Code PowerShell)

Stop the running Next.js server (`Ctrl+C`). Ensure your current work is committed or safely backed up. Extract the ZIP inside the project directory.

```powershell
cd "C:\Users\David\Documents\JaiyePass"
Expand-Archive "$HOME\Downloads\JaiyePass-Financial-Safety-Stage1.zip" -DestinationPath (Get-Location).Path -Force
powershell -ExecutionPolicy Bypass -File .\release\financial-hardening\apply.ps1 -Apply
```

The installer creates timestamped backups in `.jp-finance-backups` and never touches `.env.local`. The staged ledger script stays in `release/financial-hardening/staged-ledger.sql`. Do **not** push this SQL to production yet: provider settlement reconciliation and bank verification are still prerequisites.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Do not deploy if any command fails. Run `git diff --check` / `git diff` to inspect what changed.

## Paystack test setup

- Paystack account approval and enabled payment channels must be verified from your own dashboard.
- Set `PAYSTACK_SECRET_KEY` to the **test secret key** (`sk_test_...`) in local/server-only env. Do not paste it in chat, put it in git, or prefix it with `NEXT_PUBLIC_`.
- Paystack webhook endpoint: `/api/paystack/webhook` (full URL only on an HTTPS preview that you control and have configured). Paystack signs it with `PAYSTACK_SECRET_KEY`.
- Configure `TICKET_TOKEN_PEPPER`, `RESEND_API_KEY`, and a verified sender domain before end-to-end tests.
- Use test transactions, not real-money charges. Never enable automatic transfers without explicit authorization.

Read `AUDIT-REPORT.md` before attempting production rollout.
