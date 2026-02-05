// Simple In-Memory Rate Limiter
// For production, consider using Redis for distributed rate limiting

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store for rate limit records
const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup interval: remove expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Rate limit a request based on a key (e.g., user ID, IP address)
 *
 * @param key Unique identifier for the client (user ID, IP, etc.)
 * @param maxRequests Maximum requests allowed in the time window
 * @param windowMs Time window in milliseconds
 * @returns Result indicating if request is allowed and remaining quota
 */
export function rateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute default
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // If no record exists or it's expired, create a new one
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitMap.set(key, {
      count: 1,
      resetTime,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  // Check if limit is exceeded
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count and allow request
  record.count++;

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Get remaining rate limit for a key without incrementing
 */
export function getRateLimitStatus(key: string, maxRequests: number = 100): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime: now + 60000,
    };
  }

  return {
    allowed: record.count < maxRequests,
    remaining: Math.max(0, maxRequests - record.count),
    resetTime: record.resetTime,
  };
}

/**
 * Reset rate limit for a specific key (useful for testing or manual overrides)
 */
export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

/**
 * Get rate limit headers for API responses
 * Follows standard X-RateLimit-* header convention
 */
export function getRateLimitHeaders(result: RateLimitResult, maxRequests: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetTime / 1000).toString(), // Unix timestamp
  };
}
