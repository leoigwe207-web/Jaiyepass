"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export type ProfileFormState = { error?: string; success?: boolean };

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Name is too long.")
    .regex(/^[^<>{}]*$/, "Name contains unsupported characters."),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9()\s-]{7,20}$/, "Enter a valid phone number.")
    .or(z.literal("")),
  notificationOptIn: z.boolean(),
});

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();

  const rl = rateLimit(`profile:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return { error: "Too many updates — wait a minute and try again." };
  }

  const parsed = profileSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    notificationOptIn: formData.get("notificationOptIn") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form fields." };
  }

  const supabase = await createClient();
  const { data: savedProfile, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      notification_opt_in: parsed.data.notificationOptIn,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("profile update failed", error.code);
    return { error: "Could not save your details. Try again." };
  }

  if (!savedProfile) {
    return { error: "Your profile could not be found. Please sign out and sign in again." };
  }

  revalidatePath("/account/profile", "layout");
  return { success: true };
}
