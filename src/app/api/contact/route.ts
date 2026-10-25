import { NextResponse } from "next/server";
import { contactSchema, sanitizeText } from "@/lib/validation";
import { sendEmail } from "@/lib/email";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Contact form inbox. Messages are forwarded to the support address via the
 * configured email provider; without credentials they are logged (dev mode).
 */
export async function POST(req: Request) {
  const rl = rateLimit(`contact:${clientIp(req)}`, RATE_LIMITS.contact);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many messages — try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form fields and try again." }, { status: 400 });
  }

  const { name, email, subject, message } = parsed.data;
  const to = process.env.CONTACT_EMAIL ?? "support@jaiyepass.com";

  const result = await sendEmail({
    to,
    subject: `[JaiyePass] ${sanitizeText(subject)}`,
    text: `From: ${sanitizeText(name)} <${email}>\n\n${sanitizeText(message)}`,
  });

  if (result.status !== "sent") {
    console.warn("[contact] message logged (email provider unavailable):", {
      name: sanitizeText(name),
      email,
      subject: sanitizeText(subject),
    });
  }

  return NextResponse.json({ ok: true });
}
