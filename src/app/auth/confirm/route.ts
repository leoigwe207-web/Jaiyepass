import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "recovery";
  const next = searchParams.get("next") ?? "/update-password";

  if (token_hash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: type as "recovery", token_hash });
    if (!error) {
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/update-password";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  return NextResponse.redirect(`${origin}/reset-password?message=Recovery+link+expired.+Request+a+new+link.`);
}
