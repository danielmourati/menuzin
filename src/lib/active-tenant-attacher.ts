import { createMiddleware } from "@tanstack/react-start";
import { getActiveTenantId } from "./active-tenant";

/**
 * Anexa o header `X-Active-Tenant` quando um platform_admin está
 * impersonando uma loja. O servidor valida que o usuário tem o papel
 * antes de aceitar o header (ver `active-tenant.server.ts`).
 */
export const attachActiveTenant = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const id = getActiveTenantId();
    return next({ headers: id ? { "X-Active-Tenant": id } : {} });
  },
);
