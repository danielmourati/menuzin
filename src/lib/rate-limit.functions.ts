import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AuthCheckInput = z.object({
  action: z.string().min(1).max(50),
  identifier: z.string().max(160).optional(),
});

const AuthFailureInput = z.object({
  action: z.string().min(1).max(50),
  identifier: z.string().max(160).optional(),
  maxAttempts: z.number().int().min(1).max(100).optional().default(5),
  windowSeconds: z.number().int().min(10).max(86400).optional().default(900),
});

const AuthSuccessInput = z.object({
  action: z.string().min(1).max(50),
  identifier: z.string().max(160).optional(),
});

/**
 * Checks auth rate limit before attempting login or password reset.
 */
export const checkAuthRateLimitFn = createServerFn({ method: "POST" })
  .inputValidator((d) => AuthCheckInput.parse(d))
  .handler(async ({ data }) => {
    const { getClientIp, checkRateLimit } = await import("@/lib/rate-limit.server");
    const ip = getClientIp();
    const idKey = data.identifier ? `:${data.identifier.toLowerCase().trim()}` : "";
    const key = `auth:${data.action}:${ip}${idKey}`;

    return checkRateLimit({
      key,
      maxAttempts: 5,
      windowSeconds: 15 * 60, // 15 minutes
    });
  });

/**
 * Records a failed authentication attempt (e.g. wrong password).
 */
export const recordAuthFailureFn = createServerFn({ method: "POST" })
  .inputValidator((d) => AuthFailureInput.parse(d))
  .handler(async ({ data }) => {
    const { getClientIp, recordFailedAttempt } = await import("@/lib/rate-limit.server");
    const ip = getClientIp();
    const idKey = data.identifier ? `:${data.identifier.toLowerCase().trim()}` : "";
    const key = `auth:${data.action}:${ip}${idKey}`;

    return recordFailedAttempt({
      key,
      maxAttempts: data.maxAttempts,
      windowSeconds: data.windowSeconds,
      blockDurationSeconds: data.windowSeconds,
    });
  });

/**
 * Clears rate limiting count after a successful authentication.
 */
export const clearAuthLimitFn = createServerFn({ method: "POST" })
  .inputValidator((d) => AuthSuccessInput.parse(d))
  .handler(async ({ data }) => {
    const { getClientIp, clearRateLimit } = await import("@/lib/rate-limit.server");
    const ip = getClientIp();
    const idKey = data.identifier ? `:${data.identifier.toLowerCase().trim()}` : "";
    const key = `auth:${data.action}:${ip}${idKey}`;

    clearRateLimit(key);
    return { ok: true };
  });
