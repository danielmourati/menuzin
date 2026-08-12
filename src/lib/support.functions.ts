// Contato / suporte: recebe mensagens do formulário público e permite ao
// superadmin listar e atualizar o status. A gravação é feita no servidor
// (service role) — não há política de INSERT pública em support_messages.

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SupportMessage = {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  subject: string;
  message: string;
  source: string;
  status: string;
  internal_note: string | null;
  created_at: string;
};

const ContactInput = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().email("E-mail inválido.").max(160),
  whatsapp: z.string().trim().max(20).optional().default(""),
  subject: z.string().trim().min(2, "Informe o assunto.").max(140),
  message: z.string().trim().min(10, "Escreva sua mensagem.").max(2000),
  // honeypot — deve chegar vazio
  website: z.string().max(0).optional().default(""),
});

export const submitSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((d) => ContactInput.parse(d))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true, id: null as string | null };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const req = getRequest();
    const ip =
      req?.headers.get("cf-connecting-ip") ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;

    // Anti-abuso simples: no máximo 5 mensagens por hora por e-mail ou IP.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .or(`email.eq.${data.email.toLowerCase()},ip.eq.${ip ?? "sem-ip"}`);
    if ((count ?? 0) >= 5) {
      throw new Error("Muitas mensagens enviadas em pouco tempo. Tente novamente mais tarde.");
    }

    const { data: row, error } = await supabaseAdmin
      .from("support_messages")
      .insert({
        name: data.name,
        email: data.email.toLowerCase(),
        whatsapp: data.whatsapp.replace(/\D/g, "") || null,
        subject: data.subject,
        message: data.message,
        source: "contato",
        ip,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const id = (row as { id: string }).id;

    // Confirmação para o cliente + notificação para o suporte (fila interna).
    const { sendAppEmail } = await import("@/lib/email/send.server");
    const supportInbox = process.env["SUPPORT_NOTIFICATION_EMAIL"] || "contato@menuzin.app";
    await Promise.all([
      sendAppEmail({
        templateName: "contact-confirmation",
        recipientEmail: data.email.toLowerCase(),
        idempotencyKey: `contact-confirm-${id}`,
        templateData: { name: data.name, subject: data.subject, message: data.message },
      }),
      sendAppEmail({
        templateName: "support-notification",
        recipientEmail: supportInbox,
        idempotencyKey: `support-notify-${id}`,
        templateData: {
          name: data.name,
          email: data.email.toLowerCase(),
          whatsapp: data.whatsapp,
          subject: data.subject,
          message: data.message,
          panelUrl: "https://menuzin.app/platform/suporte",
        },
      }),
    ]);

    return { ok: true, id };
  });


export const listSupportMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_platform_admin");
    if (!isAdmin) throw new Error("Acesso restrito.");
    const { data, error } = await context.supabase
      .from("support_messages")
      .select("id, name, email, whatsapp, subject, message, source, status, internal_note, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as unknown as SupportMessage[] };
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["nova", "andamento", "respondida"]),
  internal_note: z.string().trim().max(1000).optional().default(""),
});

export const updateSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_platform_admin");
    if (!isAdmin) throw new Error("Acesso restrito.");
    const { error } = await context.supabase
      .from("support_messages")
      .update({ status: data.status, internal_note: data.internal_note || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
