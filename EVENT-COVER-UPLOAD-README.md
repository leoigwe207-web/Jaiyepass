# JaiyePass V2 — Host event-cover uploads (additive patch)

## Added
- Owner/admin/manager cover uploads, JPEG/PNG/WebP only, maximum 3 MiB.
- Host dashboard and edit page preview, replace button, error feedback.
- Upload API uses the Supabase **service role on the server only**, checks session, UUID, event organization and role; refuses demo identities and cancelled events.
- Magic-byte validation and content-type matching. No SVG or arbitrary file extensions.
- Unique storage object paths under `event-images/events/<event-id>/`, no overwrites.
- `events.image_url` database update; published events return to pending review before changes go public; replaces old owned storage object after success.
- Unit tests for validation and owned-object path checks.
- One-time optional Storage bucket setup script. **DRY RUN by default.**

## Apply to Windows project
1. Backup your project (`git commit` or copy it). Extract the provided patch ZIP into `C:\Users\David\Documents\JaiyePass`, using `Expand-Archive ... -Force`. The patch changes only the files listed inside it.
2. In your local `.env.local`, ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` point to the **intended** Supabase project; never share these values.
3. Run `node scripts/setup-event-images-bucket.mjs` (dry run: prints target host, makes no changes).
4. **Only when you approve creation of a PUBLIC image bucket in that project**, run `node scripts/setup-event-images-bucket.mjs --apply`. This is an additive Storage API change and does not drop or overwrite existing data. For a safer first test use a staging Supabase project.
5. Run `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, then deploy a **new preview**.
6. Configure Preview environment variables for your isolated staging Supabase project before testing real accounts and uploads. Current Vercel Preview has no Supabase environment variables.

## Smoke test
- Create a host account and an event draft. Open `/host/events/<id>` and upload a JPG cover.
- Verify image appears on host page, event editing, and public event once approved/published.
- Replace with PNG/WebP; ensure current cover updated.
- Reject SVG, zero-byte file, file larger than 3 MiB, and spoofed MIME.
- Verify a different account cannot upload to this event (403) and guest gets 401.
- On a published event, changing the cover returns it to `pending_review`.

## Important limitations
- Supabase Storage PUBLIC bucket: event artwork URLs are accessible to anyone who has the URL, including draft artwork. Do not upload private documents.
- Small-image backend upload hits Vercel request-body limits. Use signed direct uploads if later accepting larger images.
- The app's existing in-memory rate limiter is best-effort only across multiple Vercel function instances. Introduce a shared Redis/Upstash limiter before high-traffic launch.
- This patch does not resolve other Supabase Security Advisor warnings, verify auth/payment/scanner workflows, or update production on its own.
