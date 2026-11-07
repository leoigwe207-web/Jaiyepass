import "server-only";
import { serverEnv } from "./env";

/**
 * Transactional email adapter (server-only).
 *
 * With RESEND_API_KEY set, emails are actually sent. Without it, nothing is
 * faked: the message is recorded as `logged` and printed to the server console
 * with an explicit [EMAIL NOT SENT] prefix. The DB/email log never claims
 * delivery.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: string; content_type: string }[];
}

export type EmailResult =
  | { status: "sent"; providerMessageId?: string }
  | { status: "logged" } // credentials absent — NOT delivered
  | { status: "failed"; error: string };

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const { emailFrom } = serverEnv();
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[EMAIL NOT SENT] no RESEND_API_KEY configured. To: ${msg.to} | Subject: ${msg.subject}`,
    );
    return { status: "logged" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        attachments: msg.attachments,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { status: "failed", error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    const json = await res.json().catch(() => ({ id: undefined }));
    return { status: "sent", providerMessageId: json.id };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "email provider error" };
  }
}

// ── Concrete templates ────────────────────────────────────────────────────────

export function receiptEmail(opts: {
  to: string;
  name: string;
  eventTitle: string;
  startsAt: string;
  quantity: number;
  totalFormatted: string;
  reference: string;
  ticketLinks: string[];
  qrAttachments?: { filename: string; content: string; content_type: string }[];
}) {
  const lines = [
    `Hi ${opts.name},`,
    ``,
    `Your payment for "${opts.eventTitle}" was confirmed.`,
    `Date: ${opts.startsAt}`,
    `Tickets: ${opts.quantity}`,
    `Total: ${opts.totalFormatted}`,
    `Reference: ${opts.reference}`,
    ``,
    ...(opts.ticketLinks.length ? [`Your tickets:`, ...opts.ticketLinks.map((l, i) => `  Ticket ${i + 1}: ${l}`)] : []),
    ``,
    `Each QR code is attached as a PNG image. Show the QR at the gate. Do not share or forward your codes.`,
    ``,
    `— JaiyePass`,
  ];
  return {
    to: opts.to,
    subject: `Tickets confirmed: ${opts.eventTitle}`,
    text: lines.join("\n"),
    attachments: opts.qrAttachments,
  };
}

export function refundEmail(opts: { to: string; eventTitle: string; amountFormatted: string }) {
  return {
    to: opts.to,
    subject: `Refund processed: ${opts.eventTitle}`,
    text: [
      `Hi,`,
      ``,
      `A refund of ${opts.amountFormatted} for "${opts.eventTitle}" has been processed.`,
      `Depending on your bank, it can take 3–7 business days to appear.`,
      ``,
      `— JaiyePass`,
    ].join("\n"),
  };
}

export function passwordResetEmail(opts: { to: string; resetUrl: string }) {
  return {
    to: opts.to,
    subject: "Reset your JaiyePass password",
    text: [
      `Reset your password:`,
      opts.resetUrl,
      ``,
      `If you did not request this, you can ignore this email.`,
      ``,
      `— JaiyePass`,
    ].join("\n"),
  };
}
