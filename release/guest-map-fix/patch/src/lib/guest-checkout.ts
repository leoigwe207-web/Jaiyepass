import "server-only";
import { isValidGuestToken } from "./guest-token";
export { createGuestToken, hashGuestToken } from "./guest-token";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** A separate unpredictable, HttpOnly cookie per guest order, never an exposed order-id bearer token. */
export function guestCookieName(orderId: string) { return `jp_guest_${orderId}`; }

export async function getOrderAccess(orderId: string): Promise<null | { userId: string | null; guestEmail: string | null; guestToken: string | null }> {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(orderId)) return null;
  const admin = createAdminClient();
  const [{ data: order }, user] = await Promise.all([
    admin.from("orders").select("id,user_id,guest_email,guest_token_hash").eq("id", orderId).maybeSingle(),
    getSessionUser(),
  ]);
  if (!order) return null;
  if (order.user_id && user?.id === order.user_id) return { userId: user.id, guestEmail: null, guestToken: null };
  if (order.user_id || !order.guest_token_hash || !order.guest_email) return null;
  const token = (await cookies()).get(guestCookieName(orderId))?.value ?? "";
  if (!isValidGuestToken(token, order.guest_token_hash)) return null;
  return { userId: null, guestEmail: order.guest_email, guestToken: token };
}
