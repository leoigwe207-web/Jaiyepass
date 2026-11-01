import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { receiptEmail } from "@/lib/email";

describe("receiptEmail QR attachment contract", () => {
  it("includes an image attachment per issued ticket without exposing payload in body", () => {
    const email = receiptEmail({
      to: "attendee@example.com", name: "Ada", eventTitle: "Concert", startsAt: "Tomorrow",
      quantity: 2, totalFormatted: "₦5,000", reference: "ref-1",
      ticketLinks: ["https://jaiyepass.vercel.app/account/tickets", "https://jaiyepass.vercel.app/account/tickets"],
      qrAttachments: [
        { filename: "JaiyePass-ticket-1.png", content: "cG5n", content_type: "image/png" },
        { filename: "JaiyePass-ticket-2.png", content: "cG5n", content_type: "image/png" },
      ],
    });
    expect(email.attachments).toHaveLength(2);
    expect(email.attachments?.every((a) => a.content_type === "image/png")).toBe(true);
    expect(email.text).toContain("payment");
    expect(email.text).not.toContain("cG5n");
  });
});
