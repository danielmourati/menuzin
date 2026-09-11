// Server-side rate limiter for brute-force protection using sliding windows.
import { getRequest } from "@tanstack/react-start/server";

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale records every 5 minutes to prevent memory leaks
if (typeof globalThis !== "undefined") {
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  if (!(globalThis as unknown as { _rateLimitCleanupTimer?: unknown })._rateLimitCleanupTimer) {
    (globalThis as unknown as { _rateLimitCleanupTimer?: unknown })._rateLimitCleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of store.entries()) {
        if (record.blockedUntil && record.blockedUntil < now) {
          store.delete(key);
        } else if (now - record.firstAttemptAt > 60 * 60 * 1000 && !record.blockedUntil) {
          store.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }
}

export function getClientIp(): string {
  try {
    const request = getRequest();
    if (!request?.headers) return "127.0.0.1";
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();
  } catch {
    /* ignore */
  }
  return "127.0.0.1";
}

export interface RateLimitOptions {
  key: string;
  maxAttempts: number;
  windowSeconds: number;
  blockDurationSeconds?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  attempts: number;
  maxAttempts: number;
  remainingAttempts: number;
  resetInSeconds: number;
  blockedUntilMs: number | null;
}

/**
 * Checks if the given key is currently rate-limited without consuming an attempt.
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitCheckResult {
  const { key, maxAttempts, windowSeconds } = options;
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    return {
      allowed: true,
      attempts: 0,
      maxAttempts,
      remainingAttempts: maxAttempts,
      resetInSeconds: 0,
      blockedUntilMs: null,
    };
  }

  // Check if blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const resetInSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      attempts: record.attempts,
      maxAttempts,
      remainingAttempts: 0,
      resetInSeconds,
      blockedUntilMs: record.blockedUntil,
    };
  }

  // Check window expiry
  const windowMs = windowSeconds * 1000;
  if (now - record.firstAttemptAt > windowMs && (!record.blockedUntil || record.blockedUntil <= now)) {
    store.delete(key);
    return {
      allowed: true,
      attempts: 0,
      maxAttempts,
      remainingAttempts: maxAttempts,
      resetInSeconds: 0,
      blockedUntilMs: null,
    };
  }

  const remaining = Math.max(0, maxAttempts - record.attempts);
  const resetInSeconds = Math.ceil((record.firstAttemptAt + windowMs - now) / 1000);

  return {
    allowed: record.attempts < maxAttempts,
    attempts: record.attempts,
    maxAttempts,
    remainingAttempts: remaining,
    resetInSeconds: Math.max(0, resetInSeconds),
    blockedUntilMs: record.blockedUntil,
  };
}

/**
 * Records a failed attempt and updates rate-limiting state.
 */
export function recordFailedAttempt(options: RateLimitOptions): RateLimitCheckResult {
  const { key, maxAttempts, windowSeconds, blockDurationSeconds } = options;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const blockMs = (blockDurationSeconds ?? windowSeconds) * 1000;

  let record = store.get(key);

  if (!record || (now - record.firstAttemptAt > windowMs && (!record.blockedUntil || record.blockedUntil <= now))) {
    record = {
      attempts: 1,
      firstAttemptAt: now,
      blockedUntil: null,
    };
  } else {
    record.attempts += 1;
  }

  if (record.attempts >= maxAttempts) {
    record.blockedUntil = now + blockMs;
  }

  store.set(key, record);

  const resetInSeconds = record.blockedUntil
    ? Math.ceil((record.blockedUntil - now) / 1000)
    : Math.ceil((record.firstAttemptAt + windowMs - now) / 1000);

  return {
    allowed: record.attempts < maxAttempts && !record.blockedUntil,
    attempts: record.attempts,
    maxAttempts,
    remainingAttempts: Math.max(0, maxAttempts - record.attempts),
    resetInSeconds: Math.max(0, resetInSeconds),
    blockedUntilMs: record.blockedUntil,
  };
}

/**
 * Consumes 1 request token. If limit is exceeded, blocks the key.
 */
export function consumeRateLimit(options: RateLimitOptions): RateLimitCheckResult {
  const check = checkRateLimit(options);
  if (!check.allowed) return check;
  return recordFailedAttempt(options);
}

/**
 * Resets/clears the rate limit store for a key (e.g. after successful login).
 */
export function clearRateLimit(key: string): void {
  store.delete(key);
}
