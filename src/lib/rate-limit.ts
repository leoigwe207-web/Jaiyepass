/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for a single-instance deployment. For horizontally scaled
 * production, back this interface with Redis/Upstash — the call sites do not
 * change (documented in docs/02-technical-requirements.md).
 */

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map does not grow without bound.
const CLEANUP_MS = 5 * 60 * 1000;
if (typeof setInterval === "function") {
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [key, bucket] of buckets) {
      bucket.hits = bucket.hits.filter((t) => t > cutoff);
      if (bucket.hits.length === 0) buckets.delete(key);
    }
  }, CLEANUP_MS).unref?.();
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > now - windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    buckets.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

/** Best-effort client IP for rate-limit keys. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 5 * 60_000 },
  signup: { limit: 5, windowMs: 10 * 60_000 },
  passwordReset: { limit: 5, windowMs: 15 * 60_000 },
  checkout: { limit: 20, windowMs: 10 * 60_000 },
  promo: { limit: 15, windowMs: 5 * 60_000 },
  scan: { limit: 120, windowMs: 60_000 },
  contact: { limit: 5, windowMs: 15 * 60_000 },
  report: { limit: 5, windowMs: 30 * 60_000 },
} as const;
