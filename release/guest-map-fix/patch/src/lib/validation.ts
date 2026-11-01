import "server-only";
import { z } from "zod";

// Server-side input validation schemas. All route handlers and server actions
// parse untrusted input through these before touching the database.

export const uuidSchema = z.string().uuid();

export const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128)
    .regex(/[a-zA-Z]/, "Must include a letter")
    .regex(/[0-9]/, "Must include a number"),
  fullName: z.string().trim().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
});

export const checkoutRequestSchema = z.object({
  eventId: uuidSchema,
  promoCode: z.string().trim().max(40).optional(),
  items: z
    .array(
      z.object({
        ticketTypeId: uuidSchema,
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(5),
});

export const promoValidateSchema = z.object({
  eventId: uuidSchema,
  code: z.string().trim().min(1).max(40),
});

export const scanSchema = z.object({
  payload: z.string().trim().min(10).max(128),
  eventId: uuidSchema,
});

export const eventInputSchema = z.object({
  title: z.string().trim().min(4).max(120),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(8000),
  cityId: uuidSchema,
  venueName: z.string().trim().min(2).max(120),
  venueAddress: z.string().trim().min(4).max(200),
  categoryId: uuidSchema.optional().or(z.literal("")),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().or(z.literal("")),
  doorsOpenAt: z.string().optional().or(z.literal("")),
  ageGuidance: z.string().trim().max(80).optional().or(z.literal("")),
  refundPolicy: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const ticketTypeInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  priceKobo: z.number().int().min(0).max(100_000_000),
  quantity: z.number().int().min(1).max(1_000_000),
  perOrderLimit: z.number().int().min(1).max(100),
  salesStartAt: z.string().optional().or(z.literal("")),
  salesEndAt: z.string().optional().or(z.literal("")),
});

export const promoInputSchema = z.object({
  eventId: uuidSchema.optional().or(z.literal("")),
  code: z.string().trim().min(3).max(24).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
  kind: z.enum(["percentage", "fixed"]),
  value: z.number().int().min(1),
  maxRedemptions: z.number().int().min(1).max(100_000).optional(),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
});

export const groupPlanSchema = z.object({
  eventId: uuidSchema,
  title: z.string().trim().min(2).max(80),
  note: z.string().trim().max(280).optional().or(z.literal("")),
});

export const reportSchema = z.object({
  eventId: uuidSchema,
  reason: z.string().trim().min(4).max(60),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(4000),
});

/** Strip control characters and angle brackets from any free text we echo back. */
export function sanitizeText(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

/** Safe filename for uploads: lowercase, ascii, no path segments. */
export function sanitizeFilename(name: string): string {
  const base = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return base.replace(/^[.-]+/, "").slice(0, 80) || "upload";
}
