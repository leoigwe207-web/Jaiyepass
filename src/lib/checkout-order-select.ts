/**
 * Checkout order projection. Deliberately avoids embedding promo_codes:
 * orders.promo_code_id is a UUID without a database foreign-key constraint,
 * so PostgREST raises PGRST200 when joining orders -> promo_codes.
 */
export const CHECKOUT_ORDER_SELECT = `
  id, status, subtotal_kobo, discount_kobo, fee_kobo, total_kobo, created_at, promo_code_id,
  hold:inventory_holds!orders_hold_id_fkey(expires_at, status),
  event:events!orders_event_id_fkey(id, title, slug, starts_at, is_demo, venue:venues(name), city:cities(name)),
  order_items!order_items_order_id_fkey(name_snapshot, unit_price_kobo, quantity)
` as const;
