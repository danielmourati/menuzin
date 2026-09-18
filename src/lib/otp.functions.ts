import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";

const SendOtpInput = z.object({
  whatsapp: z.string().trim().min(8).max(20).optional(),
});

export const sendWhatsappOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendOtpInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não encontrada");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pega o número do tenant se não informado
    let phone = data.whatsapp ? data.whatsapp.replace(/\D/g, "") : "";
    if (!phone) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenant } = await (supabaseAdmin as any)
        .from("tenants")
        .select("whatsapp")
        .eq("id", resolved.tenantId)
        .maybeSingle();
      phone = tenant?.whatsapp ? tenant.whatsapp.replace(/\D/g, "") : "";
    }

    if (!phone || phone.length < 8) {
      throw new Error("Número de WhatsApp inválido para envio do código.");
    }

    // Rate Limit por IP e por número
    const { getClientIp, consumeRateLimit } = await import("@/lib/rate-limit.server");
    const ip = getClientIp();
    const rateCheck = consumeRateLimit({
      key: `otp_send:${ip}:${phone}`,
      maxAttempts: 3,
      windowSeconds: 600, // 10 minutos
    });

    if (!rateCheck.allowed) {
      const mins = Math.ceil((rateCheck.resetInSeconds || 60) / 60);
      throw new Error(`Limite de envios de código atingido. Aguarde ${mins} minuto(s) antes de tentar novamente.`);
    }

    // Gerar código numérico de 6 dígitos (ex: 482910)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

    // Desativar OTPs anteriores do mesmo telefone
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("whatsapp_otp_codes")
        .delete()
        .eq("whatsapp", phone)
        .is("verified_at", null);
    } catch {
      /* ignore if table not created yet */
    }

    // Gravar novo código OTP
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from("whatsapp_otp_codes").insert({
        whatsapp: phone,
        tenant_id: resolved.tenantId,
        code,
        attempts: 0,
        expires_at: expiresAt,
      });
    } catch (err: unknown) {
      console.error("[sendWhatsappOtp] Erro ao gravar OTP:", err);
    }

    const message = `🔒 *CÓDIGO DE VERIFICAÇÃO MENUZIN*\n\nSeu código de segurança para validar sua loja é:\n\n👉 *${code}*\n\nEste código expira em 10 minutos. Nunca compartilhe este código com ninguém.`;

    const whatsappLink = `https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}?text=${encodeURIComponent(message)}`;

    return {
      success: true,
      whatsapp: phone,
      expiresAt,
      whatsappLink,
      // Retorna em ambiente dev para facillitar testes
      code: process.env.NODE_ENV !== "production" ? code : undefined,
    };
  });

const VerifyOtpInput = z.object({
  whatsapp: z.string().trim().min(8).max(20).optional(),
  code: z.string().trim().length(6, "O código deve conter exatamente 6 dígitos"),
});

export const verifyWhatsappOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VerifyOtpInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não encontrada");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let phone = data.whatsapp ? data.whatsapp.replace(/\D/g, "") : "";
    if (!phone) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenant } = await (supabaseAdmin as any)
        .from("tenants")
        .select("whatsapp")
        .eq("id", resolved.tenantId)
        .maybeSingle();
      phone = tenant?.whatsapp ? tenant.whatsapp.replace(/\D/g, "") : "";
    }

    // Busca o código ativo mais recente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: records, error } = await (supabaseAdmin as any)
      .from("whatsapp_otp_codes")
      .select("*")
      .eq("whatsapp", phone)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const otpRecord = records?.[0];

    if (error || !otpRecord) {
      throw new Error("Nenhum código de verificação válido encontrado. Solicite um novo código.");
    }

    // Verifica se expirou
    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      throw new Error("O código de verificação expirou. Solicite um novo envio.");
    }

    // Verifica limite de tentativas (máximo 3)
    if (otpRecord.attempts >= 3) {
      throw new Error("Número máximo de tentativas incorretas excedido. Solicite um novo código.");
    }

    // Valida o código
    if (otpRecord.code !== data.code.trim()) {
      // Incrementa tentativas
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("whatsapp_otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      const remaining = 2 - otpRecord.attempts;
      throw new Error(`Código incorreto. Você ainda tem ${remaining} tentativa(s).`);
    }

    // Marca como verificado
    const nowIso = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("whatsapp_otp_codes")
      .update({ verified_at: nowIso })
      .eq("id", otpRecord.id);

    // Marca tenant como whatsapp_verified = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("tenants")
      .update({ whatsapp_verified: true })
      .eq("id", resolved.tenantId);

    return {
      success: true,
      message: "WhatsApp verificado com sucesso!",
    };
  });

export const getWhatsappVerificationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) return { verified: true, whatsapp: "" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tenant } = await (supabaseAdmin as any)
      .from("tenants")
      .select("whatsapp, whatsapp_verified")
      .eq("id", resolved.tenantId)
      .maybeSingle();

    return {
      verified: tenant?.whatsapp_verified ?? false,
      whatsapp: tenant?.whatsapp ?? "",
    };
  });
