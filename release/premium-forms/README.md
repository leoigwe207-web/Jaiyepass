# JaiyePass — Premium Forms & Profile-Save Fix

## What changes

- Fixes the profile-save error by removing a write to the protected `updated_at` column. Your existing Supabase trigger maintains it automatically.
- Rebuilds Profile fields with separate labels, hints, responsive input spacing, and a disabled loading state.
- Organizes Event creation/editing into editorial form sections with clearer placeholders and a more intuitive category selector.
- Re-labels all 10 existing categories (e.g. `Tech` -> `Technology & Business`) without changing category UUIDs or slugs.
- Refines organization and ticket creation fields, plus shared placeholder/focus styles on other site forms.
- Fixes the profile Password link to use the reset-password GET page rather than submitting a POST to it.

## Install (Windows PowerShell)
1. Run from your local JaiyePass project root.
2. Extract `JaiyePass-Premium-Forms-Profile-Fix.zip` into the project root.
3. Run: `powershell -ExecutionPolicy Bypass -File .\release\premium-forms\apply.ps1`
4. The installer backs up every overwritten file to `release/backups/` before applying.
5. Run: `npm.cmd run typecheck` then `npm.cmd run build` then `npm.cmd test`.
6. Restart `npm.cmd run dev` and test `/account/profile` and `/host/events/new`.

No SQL migration, secret key, payment, or admin permission is changed. Existing category database IDs/slugs are preserved.

Note: Source syntax validated before packaging. Full build and browser flows must be run on the user's machine, which has the real project dependencies and environment.
