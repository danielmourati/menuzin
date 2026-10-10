import { createFileRoute } from "@tanstack/react-router";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Áudio (transcrição) e localização (endereço aproximado) para o chat da IA.
export const Route = createFileRoute("/api/public/ai-chat-media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkRateLimit, recordFailedAttempt, getClientIp } = await import("@/lib/rate-limit.server");
        const rl = { key: `ai-media:${getClientIp(request)}`, maxAttempts: 30, windowSeconds: 600, blockDurationSeconds: 600 };
        if (!checkRateLimit(rl).allowed) return json(429, { error: "Muitas tentativas. Aguarde alguns minutos." });
        recordFailedAttempt(rl);

        const form = await request.formData().catch(() => null);
        if (!form) return json(400, { error: "Requisição inválida." });
        const id = String(form.get("conversationId") ?? "");
        const accessKey = String(form.get("accessKey") ?? "");
        const kind = String(form.get("kind") ?? "");
        if (!/^[0-9a-f-]{36}$/i.test(id) || accessKey.length < 20 || accessKey.length > 100) return json(400, { error: "Requisição inválida." });

        const srv = await import("@/lib/ai-agent.server");
        const conv = await srv.getConversation(id, accessKey);
        if (!conv || conv.status !== "open") return json(404, { error: "Conversa indisponível." });

        if (kind === "audio") {
          const file = form.get("file");
          if (!(file instanceof File) || file.size === 0) return json(400, { error: "Áudio vazio." });
          if (file.size > 3 * 1024 * 1024) return json(413, { error: "Áudio muito longo (máx. 60 s)." });
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return json(500, { error: "Transcrição não configurada." });
          const fd = new FormData();
          fd.append("file", file, file.name || "audio.webm");
          fd.append("model", "openai/gpt-transcribe");
          fd.append("language", "pt");
          const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
            body: fd,
          });
          if (!res.ok) {
            const t = await res.text();
            console.error("[ai-media] transcrição", res.status, t.slice(0, 300));
            if (res.status === 402) return json(402, { error: "Áudio indisponível no momento. Escreva sua mensagem." });
            if (res.status === 429) return json(429, { error: "Muitos áudios agora. Tente em instantes." });
            return json(502, { error: "Não consegui entender o áudio. Tente de novo ou escreva." });
          }
          const data = (await res.json().catch(() => ({}))) as { text?: string };
          const text = (data.text ?? "").trim();
          if (!text) return json(422, { error: "Não ouvi nada no áudio. Tente de novo." });
          // Guarda o áudio original (bucket privado) para o atendente poder ouvir.
          let audioPath: string | null = null;
          try {
            const type = (file.type || "audio/webm").split(";")[0];
            const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("mpeg") ? "mp3" : "webm";
            const path = `${conv.tenant_id}/${conv.id}/${crypto.randomUUID()}.${ext}`;
            const { error: upErr } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.storage
              .from("chat-audio").upload(path, await file.arrayBuffer(), { contentType: type, upsert: false });
            if (upErr) console.error("[ai-media] guardar áudio", upErr.message); else audioPath = path;
          } catch (e) { console.error("[ai-media] guardar áudio", (e as Error).message); }
          return json(200, { text: text.slice(0, 800), audioPath });
        }

        if (kind === "location") {
          const lat = Number(form.get("lat")), lng = Number(form.get("lng"));
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return json(400, { error: "Localização inválida." });
          const key = process.env.GOOGLE_MAPS_API_KEY;
          const out: Record<string, string | number | null> = { lat, lng, street: null, number: null, neighborhood: null, city: null, state: null, cep: null };
          if (key) {
            try {
              const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${key}`);
              const g = (await r.json()) as any;
              const comps: any[] = g?.results?.[0]?.address_components ?? [];
              const pick = (t: string, short = false) => { const c = comps.find((x) => x.types?.includes(t)); return c ? (short ? c.short_name : c.long_name) : null; };
              out.street = pick("route"); out.number = pick("street_number");
              out.neighborhood = pick("sublocality_level_1") ?? pick("sublocality") ?? pick("neighborhood");
              out.city = pick("administrative_area_level_2") ?? pick("locality");
              out.state = pick("administrative_area_level_1", true);
              out.cep = pick("postal_code");
            } catch (e) { console.error("[ai-media] geocode", (e as Error).message); }
          }
          await (await import("@/integrations/supabase/client.server")).supabaseAdmin
            .from("ai_conversations").update({ customer_location: { lat, lng, street: out.street, number: out.number, neighborhood: out.neighborhood, cep: out.cep, shared_at: new Date().toISOString() } as never, updated_at: new Date().toISOString() } as never).eq("id", conv.id);
          return json(200, out);
        }
        return json(400, { error: "Tipo inválido." });
      },
    },
  },
});
