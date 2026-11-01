"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, signupSchema } from "@/lib/validation";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { supabaseConfigured } from "@/lib/queries";

export interface AuthFormState { error?: string; message?: string }

async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:${ip}`;
}

function authConfigured(): boolean {
  return supabaseConfigured();
}

/** Avoid dumping credentials, emails or tokens into server logs. */
function recordAuthFailure(action: string, error: unknown) {
  if (error && typeof error === "object") {
    const e = error as { code?: string; status?: number };
    console.error(`[JaiyePass Auth ${action}]`, { code: e.code ?? "unknown", status: e.status ?? "unknown" });
  } else {
    console.error(`[JaiyePass Auth ${action}]`, { code: "unexpected_error" });
  }
}

function loginErrorMessage(error: { code?: string; status?: number }) {
  if (error.code === "email_not_confirmed") return "Confirm your email first, then sign in. Check your inbox or spam folder.";
  if (error.code === "invalid_credentials") return "Incorrect email or password. Check your details or reset your password.";
  if (error.status === 429) return "Too many sign-in attempts. Please try again later.";
  return "Sign-in could not be completed. Check the Supabase configuration or try again.";
}

function canonicalAppUrl(): string {
  // Set NEXT_PUBLIC_APP_URL to http://localhost:3000 for local development.
  return serverEnv().appUrl.replace(/\/$/, "");
}

/** Backfill accounts created via the Supabase dashboard. Never elevate existing roles. */
async function ensureAttendeeProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<boolean> {
  try {
    const email = user.email;
    if (!email || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").upsert({
      id: user.id,
      email,
      full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
      role: "attendee",
    }, { onConflict: "id", ignoreDuplicates: true });
    return !error;
  } catch {
    return false;
  }
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rl = rateLimit(await clientKey("login"), RATE_LIMITS.login);
  if (!rl.ok) return { error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` };
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const next = String(formData.get("next") ?? "");
  // Only relative, same-site paths may override the role-based destination.
  const nextRoute = next.startsWith("/") && !next.startsWith("//") &&
    !next.includes("\\") && !/[\r\n]/.test(next) && next !== "/" &&
    !next.startsWith("/login") && !next.startsWith("/signup") ? next : null;
  let destination = "/account/tickets";

  if (!authConfigured()) return { error: "Sign-in configuration is incomplete. Please contact the site administrator." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      recordAuthFailure("login", error);
      return { error: loginErrorMessage(error) };
    }
    if (!data.user) return { error: "No user session was returned. Please try again." };
    // Resolve the role ONLY after Supabase verifies the signed-in identity.
    // This server-only query is scoped to the authenticated user's id, not a
    // form field. It prevents RLS read hiccups from masquerading as attendee.
    const admin = createAdminClient();
    const { data: existingProfile, error: profileError } = await admin
      .from("profiles").select("id, role")
      .eq("id", data.user.id).maybeSingle();
    if (profileError) {
      recordAuthFailure("profile-read", profileError);
      return { error: "Sign-in succeeded, but your account permissions could not be loaded. Try again." };
    }
    let role: "admin" | "attendee" = "attendee";
    if (!existingProfile) {
      if (!(await ensureAttendeeProfile(data.user))) {
        return { error: "Signed in, but your account profile could not be created. Please contact support." };
      }
    } else {
      role = existingProfile.role === "admin" ? "admin" : "attendee";
    }
    if (nextRoute?.startsWith("/admin") && role !== "admin") {
      await supabase.auth.signOut();
      return { error: "This account does not have administrator access. Sign in with your admin account." };
    }
    destination = nextRoute ?? (role === "admin" ? "/admin" : "/account/tickets");
  } catch (error) {
    recordAuthFailure("login", error);
    return { error: "Unable to connect to authentication. Run the local auth diagnostic and try again." };
  }
  redirect(destination);
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rl = rateLimit(await clientKey("signup"), RATE_LIMITS.signup);
  if (!rl.ok) return { error: `Too many signup attempts. Try again in ${rl.retryAfterSeconds}s.` };
  const parsed = signupSchema.safeParse({
    email: formData.get("email"), password: formData.get("password"), fullName: formData.get("fullName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields." };
  if (!authConfigured()) return { error: "Account creation is not configured yet. Please contact the site administrator." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: `${canonicalAppUrl()}/auth/callback` },
    });
    if (error) {
      recordAuthFailure("signup", error);
      if (error.status === 429) return { error: "Too many email requests. Please try again later." };
      if (String(error.code) === "email_provider_disabled") return { error: "Email signup is disabled in Supabase Authentication settings." };
      if (String(error.code) === "email_address_invalid") return { error: "This email address could not be accepted. Please check it." };
      if (String(error.code) === "email_address_not_authorized") return { error: "The email delivery service is restricted. The administrator must configure SMTP in Supabase." };
      return { error: "Account creation failed. Check your Supabase email provider settings or try again." };
    }
    // Do not create profiles here: email confirmation may still be pending, and
    // Supabase can return an obfuscated user for an existing email. The signed-in
    // login path creates the attendee profile after authentication succeeds.
    // Never disclose whether an email is registered.
    return { message: data.session ? "Your account is ready. You can now sign in." : "If the email address is eligible, we’ve sent a confirmation link. Check your inbox and spam folder before signing in." };
  } catch (error) {
    recordAuthFailure("signup", error);
    return { error: "Unable to connect to authentication. Run the local auth diagnostic." };
  }
}

export async function resetPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rl = rateLimit(await clientKey("reset"), RATE_LIMITS.passwordReset);
  if (!rl.ok) return { error: `Too many reset requests. Try again in ${rl.retryAfterSeconds}s.` };
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return { error: "Enter a valid email address." };
  if (!supabaseConfigured()) return { error: "Password recovery isn't configured yet. Please contact support." };
  try {
    const supabase = await createClient();
    // Supabase Auth sends the real reset link; never send a second, invented link.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${canonicalAppUrl()}/auth/callback?next=/update-password`,
    });
    if (error) {
      recordAuthFailure("password-reset", error);
      if (error.status === 429) return { error: "Email requests are temporarily rate-limited. Try again later." };
      return { error: "Reset email could not be sent. Check Supabase email/SMTP settings or try again." };
    }
  } catch (error) {
    recordAuthFailure("password-reset", error);
    return { error: "Unable to connect to authentication. Run the local auth diagnostic." };
  }
  return { message: "If an account exists for that email, you'll receive a secure reset link. Check your inbox and spam folder." };
}

export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rl = rateLimit(await clientKey("update-password"), RATE_LIMITS.passwordReset);
  if (!rl.ok) return { error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (password !== confirm) return { error: "Passwords do not match." };
  if (password.length < 10 || password.length > 128 || !/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return { error: "Use 10–128 characters, including a letter and a number." };
  }
  if (!supabaseConfigured()) return { error: "Password recovery is not configured yet." };
  try {
    const supabase = await createClient();
    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse.user) return { error: "Your reset link has expired or is invalid. Request another password reset." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: "Could not update your password. Please request a fresh reset link." };
    return { message: "Password updated successfully. Your account is secure." };
  } catch {
    return { error: "Unable to update the password. Please try again shortly." };
  }
}
