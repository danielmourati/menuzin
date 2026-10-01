import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const Body = z.object({ order_id: z.string().uuid(), tenant_id: z.string().uuid() });

// Chamado pelo gatilho do banco a cada pedido novo: avisa os celulares do lojista.
export const Route = createFileRoute("/api/public/order-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-push-token") || "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfg } = await (supabaseAdmin as any)
          .from("internal_config")
          .select("value")
          .eq("key", "order_push_token")
          .maybeSingle();
        const expected = String(cfg?.value || "");
        const a = Buffer.from(token);
        const b = Buffer.from(expected);
        if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        try {
          const { sendAdminOrderPushServer } = await import("@/lib/push-notifications.server");
          const r = await sendAdminOrderPushServer(parsed.data.order_id, parsed.data.tenant_id);
          return Response.json(r);
        } catch (e) {
          console.error("[order-push]", e);
          return new Response("Error", { status: 500 });
        }
      },
    },
  },
});
