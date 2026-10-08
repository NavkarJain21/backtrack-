// Simple in-memory rate limiter (resets on server restart)
// For production, use Redis or Upstash

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const CONFIGS: Record<string, RateLimitConfig> = {
  generate: { windowMs: 60_000, maxRequests: 5 },
  "node-detail": { windowMs: 60_000, maxRequests: 20 },
  adjust: { windowMs: 60_000, maxRequests: 10 },
};

export function rateLimit(
  ip: string,
  route: keyof typeof CONFIGS
): { allowed: boolean; retryAfter?: number } {
  const config = CONFIGS[route] ?? { windowMs: 60_000, maxRequests: 10 };
  const key = `${route}:${ip}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + config.windowMs };
    store.set(key, entry);
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  store.set(key, entry);
  return { allowed: true };
}

export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
