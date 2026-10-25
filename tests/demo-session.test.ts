import { describe, expect, it } from "vitest";
import {
  DEMO_ACCOUNTS,
  isDemoModeAllowed,
  signDemoToken,
  verifyDemoToken,
  verifyDemoCredentials,
} from "@/lib/demo";

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;

describe("demo mode fail-closed gate", () => {
  it("is only allowed without a database and outside production", () => {
    expect(isDemoModeAllowed(false, "development")).toBe(true);
    expect(isDemoModeAllowed(false, "test")).toBe(true);
    expect(isDemoModeAllowed(false, "production")).toBe(false);
    expect(isDemoModeAllowed(true, "development")).toBe(false);
    expect(isDemoModeAllowed(true, "production")).toBe(false);
  });
});

describe("demo session tokens", () => {
  it("round-trips a valid, unexpired token", () => {
    const token = signDemoToken("admin", NOW + HOUR);
    expect(verifyDemoToken(token, NOW)).toBe("admin");
  });

  it("rejects a tampered signature", () => {
    const token = signDemoToken("host", NOW + HOUR);
    const [role, exp] = token.split(".");
    const tampered = `${role}.${exp}.deadbeef${"0".repeat(56)}`;
    expect(verifyDemoToken(tampered, NOW)).toBeNull();
  });

  it("rejects a role swapped onto someone else's signature", () => {
    const token = signDemoToken("attendee", NOW + HOUR);
    const [, exp, sig] = token.split(".");
    const escalated = `admin.${exp}.${sig}`;
    expect(verifyDemoToken(escalated, NOW)).toBeNull();
  });

  it("rejects expired sessions", () => {
    const token = signDemoToken("scanner", NOW - 1);
    expect(verifyDemoToken(token, NOW)).toBeNull();
    // Same token is valid before expiry.
    expect(verifyDemoToken(token, NOW - HOUR)).toBe("scanner");
  });

  it("rejects garbage, empty and unknown-role tokens", () => {
    expect(verifyDemoToken(undefined, NOW)).toBeNull();
    expect(verifyDemoToken("", NOW)).toBeNull();
    expect(verifyDemoToken("not-a-token", NOW)).toBeNull();
    expect(verifyDemoToken("a.b", NOW)).toBeNull();
    expect(verifyDemoToken("superuser.9999999999999.abc", NOW)).toBeNull();
  });
});

describe("preview demo credentials (spec §3)", () => {
  const specAccounts = [
    "attendee@jaiyepass.demo",
    "host@jaiyepass.demo",
    "scanner@jaiyepass.demo",
    "admin@jaiyepass.demo",
  ];

  it("accepts each spec account with the spec password", () => {
    for (const email of specAccounts) {
      const role = verifyDemoCredentials(email, "JaiyeDemo123!");
      expect(role).not.toBeNull();
      expect(DEMO_ACCOUNTS[role!].email).toBe(email);
    }
  });

  it("rejects wrong passwords and unknown emails", () => {
    expect(verifyDemoCredentials("attendee@jaiyepass.demo", "wrong")).toBeNull();
    expect(verifyDemoCredentials("nobody@jaiyepass.demo", "JaiyeDemo123!")).toBeNull();
    expect(verifyDemoCredentials("", "")).toBeNull();
  });

  it("matches emails case-insensitively", () => {
    expect(verifyDemoCredentials("Admin@JaiyePass.demo", "JaiyeDemo123!")).toBe("admin");
  });
});
