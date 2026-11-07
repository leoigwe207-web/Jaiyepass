import { afterEach, describe, expect, it, vi } from "vitest";
import { paystackKeyAllowed, paidCheckoutConfigured, serverEnv } from "@/lib/env";

afterEach(() => vi.unstubAllEnvs());

describe("Paystack preview and callback safety", () => {
  it("rejects live, empty, and malformed keys in Preview", () => {
    expect(paystackKeyAllowed("sk_test_example", "preview")).toBe(true);
    expect(paystackKeyAllowed("sk_live_example", "preview")).toBe(false);
    expect(paystackKeyAllowed("", "preview")).toBe(false);
    expect(paystackKeyAllowed("abc", "preview")).toBe(false);
  });

  it("disables checkout when a live secret is accidentally configured for Preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_unsafe_on_preview");
    expect(paidCheckoutConfigured()).toBe(false);
    expect(serverEnv().testMode).toBe(true);
  });

  it("enables checkout only after a test secret is configured for Preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_example");
    expect(paidCheckoutConfigured()).toBe(true);
    expect(serverEnv().testMode).toBe(false);
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    expect(paidCheckoutConfigured()).toBe(false);
  });

  it("uses the active Vercel Preview hostname for Paystack callback URLs", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "jaiyepass-preview-example.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://jaiyepass.vercel.app");
    expect(serverEnv().appUrl).toBe("https://jaiyepass-preview-example.vercel.app");
  });

  it("retains the configured production URL in Production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "some-build.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://jaiyepass.vercel.app");
    expect(serverEnv().appUrl).toBe("https://jaiyepass.vercel.app");
  });
});
