import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const Body = z.object({ order_id: z.string().uuid(), tenant_id: z.string().uuid() });

export const Route = createFileRoute("/api/public/order-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const given = request.headers.get("x-push-token") ?? "";
        const { data: cfg } = await (supabaseAdmin as any)
          .from("internal_config").select("value").eq("key", "order_push_token").maybeSingle();
        const expected: string = cfg?.value ?? "";
        const a = Buffer.from(given);
        const b = Buffer.from(expected);
        if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }
        let parsed;
        try { parsed = Body.parse(await request.json()); } catch { return new Response("Bad request", { status: 400 }); }
        const { sendAdminOrderPushServer } = await import("@/lib/push-notifications.server");
        const result = await sendAdminOrderPushServer(parsed.order_id, parsed.tenant_id);
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
