import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { guestCheckoutEnabled } from "@/lib/env";
import { isValidGuestToken } from "./guest-token";

export { createGuestToken, hashGuestToken } from "./guest-token";

/** Guest ownership is a random HttpOnly secret hashed in the database. */
export function guestCookieName(orderId: string): string {
  return `jp_guest_${orderId}`;
}

export type OrderAccess =
  | { userId: string; guestEmail: null; guestToken: null }
  | { userId: null; guestEmail: string; guestToken: string };

/** Missing or unauthorized orders return exactly the same response. */
export async function getOrderAccess(orderId: string): Promise<OrderAccess | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) return null;
  const [session, cookieStore] = await Promise.all([getSessionUser(), cookies()]);
  const admin = createAdminClient();
  const result = guestCheckoutEnabled()
    ? await admin.from("orders").select("id,user_id,guest_email,guest_token_hash").eq("id", orderId).maybeSingle()
    : await admin.from("orders").select("id,user_id").eq("id", orderId).maybeSingle();
  const { error } = result;
  const order = result.data as {
    user_id: string | null; guest_email?: string | null; guest_token_hash?: string | null;
  } | null;
  if (error || !order) return null;
  if (order.user_id) {
    if (session?.id !== order.user_id) return null;
    return { userId: session.id, guestEmail: null, guestToken: null };
  }
  if (!order.guest_token_hash || !order.guest_email) return null;
  const token = cookieStore.get(guestCookieName(orderId))?.value ?? "";
  return isValidGuestToken(token, order.guest_token_hash)
    ? { userId: null, guestEmail: order.guest_email, guestToken: token }
    : null;
}
