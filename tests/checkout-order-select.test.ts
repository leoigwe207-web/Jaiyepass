import { describe, expect, it } from "vitest";
import { CHECKOUT_ORDER_SELECT } from "@/lib/checkout-order-select";

describe("checkout order relationships", () => {
  it("reads the promo UUID without embedding a missing foreign key", () => {
    expect(CHECKOUT_ORDER_SELECT).toContain("promo_code_id");
    expect(CHECKOUT_ORDER_SELECT).not.toMatch(/promo_codes\s*\(/);
    expect(CHECKOUT_ORDER_SELECT).not.toMatch(/promo_code\s*:/);
  });

  it("joins only through existing named order foreign keys", () => {
    expect(CHECKOUT_ORDER_SELECT).toContain("orders_hold_id_fkey");
    expect(CHECKOUT_ORDER_SELECT).toContain("orders_event_id_fkey");
    expect(CHECKOUT_ORDER_SELECT).toContain("order_items_order_id_fkey");
  });
});
