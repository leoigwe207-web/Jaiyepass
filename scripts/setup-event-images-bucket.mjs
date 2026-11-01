/**
 * One-time, explicitly opt-in bucket creation, using Supabase Storage API.
 * DRY RUN by default. Only run with --apply after confirming the target project.
 * Requires .env.local containing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY locally (.env.local). Do not share these keys.");
  process.exit(1);
}
const projectHost = new URL(url).hostname;
const name = "event-images";
const config = {
  public: true,
  fileSizeLimit: 3 * 1024 * 1024,
  allowedMimeTypes: ["image/webp"],
};
console.log(`Target Supabase host: ${projectHost}`);
console.log(`Bucket: ${name} (PUBLIC artwork; 3 MB; WebP-only; uploads limited to server API)`);
if (!process.argv.includes("--apply")) {
  console.log("DRY RUN — nothing changed. Run with --apply only after confirming the project above.");
  process.exit(0);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: existing, error: lookupError } = await supabase.storage.getBucket(name);
if (existing) {
  const ok = existing.public && existing.file_size_limit === config.fileSizeLimit &&
    existing.allowed_mime_types?.length === 1 && existing.allowed_mime_types[0] === "image/webp";
  if (!ok) {
    console.error("Bucket exists but configuration differs. Review in the Supabase dashboard; not changing it automatically.");
    process.exit(1);
  }
  console.log("Bucket already exists with expected configuration. No change.");
  process.exit(0);
}
if (lookupError && !["404", "not_found"].includes(String(lookupError.statusCode ?? "").toLowerCase()) &&
    !/not found|does not exist/i.test(lookupError.message ?? "")) {
  console.error("Could not inspect existing bucket:", lookupError.message);
  process.exit(1);
}
const { error } = await supabase.storage.createBucket(name, config);
if (error) {
  console.error("Bucket creation failed:", error.message);
  process.exit(1);
}
console.log("Bucket created. Public reading is enabled; client-side upload/delete policies were NOT added.");
