#!/usr/bin/env node
// Offline verification for the PostHog product-analytics integration.
//
//   node posthog-analytics.verify.mjs
//
// Runs the real handler tests in tests/analytics.test.ts with the repository's
// own Vitest, then re-reads the manifest and the npm lock. No browser, no
// network, no real project token: the PostHog SDK is replaced by an in-memory
// spy inside the test file, and the child process gets a synthetic
// configuration only. Exits non-zero on a missing runner, missing tests,
// failures, or a run that asserted nothing.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const VITEST_ENTRY = path.join(ROOT, "node_modules", "vitest", "vitest.mjs");
const TEST_FILE = path.join(ROOT, "tests", "analytics.test.ts");
const PINNED_VERSION = "1.438.13";
const EXPECTED_MIN_TESTS = 12;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

// ── Preflight: toolchain, tests, pinned install ──────────────────────────────
if (!existsSync(VITEST_ENTRY)) {
  fail("missing test runner (node_modules/vitest/vitest.mjs) — run `npm install` first");
}
if (!existsSync(TEST_FILE)) {
  fail("missing tests/analytics.test.ts — refusing to report a pass without the handler tests");
}

const manifest = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(path.join(ROOT, "package-lock.json"), "utf8"));
if (manifest.dependencies?.["posthog-js"] !== PINNED_VERSION) {
  fail(`package.json must pin posthog-js ${PINNED_VERSION}, found ${manifest.dependencies?.["posthog-js"]}`);
}
if (lock.packages?.["node_modules/posthog-js"]?.version !== PINNED_VERSION) {
  fail(`package-lock.json must resolve posthog-js ${PINNED_VERSION}`);
}

// ── Isolated child environment ───────────────────────────────────────────────
// Start from {}: only OS/path/temp values plus a fixed synthetic configuration.
// No .env values, no provider credentials, no proxy settings that could reach
// out, and a token that is obviously not a PostHog key (never phc_/phx_).
const OS_KEYS = [
  "PATH", "Path", "SystemRoot", "SystemDrive", "windir", "ComSpec", "PATHEXT",
  "TEMP", "TMP", "TMPDIR", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "APPDATA",
  "LOCALAPPDATA", "ProgramFiles", "ProgramData", "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE", "OS", "LANG", "LC_ALL",
];

const env = {};
for (const key of OS_KEYS) {
  if (typeof process.env[key] === "string") env[key] = process.env[key];
}
Object.assign(env, {
  NODE_ENV: "test",
  TZ: "UTC",
  CI: "1",
  // Synthetic configuration, injected before any test import runs.
  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "synthetic-project-token",
  NEXT_PUBLIC_POSTHOG_HOST: "https://posthog.invalid",
  POSTHOG_ANALYTICS_OFFLINE: "1",
});

// ── Run the real tests ───────────────────────────────────────────────────────
const reportDir = mkdtempSync(path.join(tmpdir(), "jaiyepass-analytics-"));
const reportFile = path.join(reportDir, "report.json");

const result = spawnSync(
  process.execPath,
  [
    VITEST_ENTRY,
    "run",
    "tests/analytics.test.ts",
    "--reporter=json",
    `--outputFile=${reportFile}`,
    "--no-file-parallelism",
  ],
  {
    cwd: ROOT,
    env,
    shell: false,
    timeout: 300_000,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  },
);

if (result.error) {
  rmSync(reportDir, { recursive: true, force: true });
  fail(`could not run the test runner (${result.error.code ?? result.error.message})`);
}
if (result.signal) {
  rmSync(reportDir, { recursive: true, force: true });
  fail(`test run was killed (${result.signal}) — treat as failed, not passed`);
}

let report = null;
try {
  report = JSON.parse(readFileSync(reportFile, "utf8"));
} catch {
  report = null;
}
rmSync(reportDir, { recursive: true, force: true });

if (result.status !== 0 || !report) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  fail(`analytics handler tests failed (exit ${result.status ?? "signal"})`);
}

// ── Assert the run actually proved something ─────────────────────────────────
const total = Number(report.numTotalTests ?? 0);
const passed = Number(report.numPassedTests ?? 0);
const failed = Number(report.numFailedTests ?? 0);
const assertions = (report.testResults ?? []).flatMap((file) => file.assertionResults ?? []);
const passedAssertions = assertions.filter((test) => test.status === "passed").length;

if (total === 0) fail("zero tests ran — refusing to report a pass");
if (passedAssertions === 0) fail("zero passing assertions — refusing to report a pass");
if (failed > 0 || passed !== total || passedAssertions !== total) {
  for (const test of assertions.filter((t) => t.status !== "passed")) {
    console.error(`  ✗ ${test.fullName ?? test.title}`);
  }
  fail(`${total - passed} of ${total} analytics tests did not pass`);
}
if (total < EXPECTED_MIN_TESTS) {
  fail(`expected at least ${EXPECTED_MIN_TESTS} analytics tests, ran ${total} — coverage went missing`);
}

console.log(
  `PASS: ${passed}/${total} offline analytics tests passed; posthog-js ${PINNED_VERSION} pinned in package.json and package-lock.json.`,
);
console.log("No network delivery: the PostHog SDK was an in-memory spy with a synthetic token and host.");
