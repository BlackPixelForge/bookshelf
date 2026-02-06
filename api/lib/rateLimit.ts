import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory rate limiter for serverless functions.
// Note: Each serverless instance has its own memory, so this provides
// per-instance limiting. For distributed rate limiting, use an external
// store (Redis, KV, etc.). This still provides meaningful protection
// against single-instance bursts.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10;

function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] as string || 'unknown';
}

export function checkRateLimit(req: VercelRequest, res: VercelResponse): boolean {
  const ip = getClientIP(req);
  const now = Date.now();

  // Clean expired entries periodically
  if (store.size > 10000) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }

  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false; // not rate limited
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({ error: 'Too many attempts, please try again later' });
    return true; // rate limited
  }

  return false; // not rate limited
}
