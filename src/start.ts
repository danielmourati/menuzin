import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { attachActiveTenant } from "@/lib/active-tenant-attacher";
import { getClientIp, checkNavigationAnomalyRateLimit } from "./lib/rate-limit.server";

const rateLimitMiddleware = createMiddleware().server(async ({ next, request }) => {
  const ip = getClientIp(request);
  const result = checkNavigationAnomalyRateLimit(ip);
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Muitas requisições em curto espaço de tempo. Por razões de segurança, o acesso foi temporariamente suspenso. Tente novamente em alguns minutos.",
        resetInSeconds: result.resetInSeconds,
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "retry-after": String(result.resetInSeconds),
        },
      }
    );
  }
  return await next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [rateLimitMiddleware, errorMiddleware],
  functionMiddleware: [attachSupabaseAuth, attachActiveTenant],
}));
