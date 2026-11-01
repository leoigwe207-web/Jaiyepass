import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const read = (p) => readFileSync(p, "utf8");
const checks = [
  [!existsSync("src/lib/demo.ts"), "demo identity module absent"],
  [!existsSync("src/app/api/dev/complete-order/route.ts"), "test-order backdoor absent"],
  [!existsSync("src/lib/sample-events.ts"), "synthetic listings absent"],
  [!read("src/lib/queries.ts").includes("sampleEvents"), "production reads cannot fall back to samples"],
  [read("src/app/api/host/events/[id]/image/route.ts").includes(".webp({"), "uploaded artwork re-encoded as WebP"],
  [read("src/app/api/host/events/[id]/image/route.ts").includes("limitInputPixels"), "image decoding limits pixels"],
  [read("src/lib/checkout.ts").includes("QRCode.toBuffer"), "PNG QR attachments generated server-side"],
  [read("src/lib/checkout.ts").includes("claim_ticket_email_delivery"), "atomic ticket email send claims"],
  [read("src/app/admin/emails/page.tsx").includes("ticket_email_deliveries"), "delivery dashboard wired"],
  [read("supabase/migrations/20261027000100_production_hardening.sql").includes("revoke insert, update on public.profiles"), "profile role escalation restricted"],
];
checks.forEach(([ok,name]) => { assert.ok(ok,`FAIL: ${name}`); console.log(`PASS: ${name}`) });
console.log(`Passed ${checks.length} source-level checks. These are not a substitute for npm test/build or live E2E.`);
