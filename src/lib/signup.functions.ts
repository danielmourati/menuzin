// Cadastro público de tenant no plano Presença.
// Fluxo:
//  1. Valida input (Zod)
//  2. Cria usuário auth (email já confirmado)
//  3. Cria tenant no plano "presenca"
//  4. Vincula profile.tenant_id
//  5. Insere user_roles como owner
// A assinatura Presença é criada automaticamente pelo trigger
// `create_default_subscription_for_tenant`.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";
import { slugify } from "@/lib/utils";
import { BUSINESS_TYPES } from "@/lib/business-types";

const SlugSchema = z
  .string()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9-]+$/)
  .refine((s) => !RESERVED_SLUGS.has(s), { message: "Esse endereço é reservado." });

const SignupInput = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().optional().default(""),
  whatsapp: z.string().trim().min(8).max(20),
  city: z.string().trim().max(80).optional().default(""),
  state: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(240).optional().default(""),
  neighborhood: z.string().trim().max(80).optional().default(""),
  cep: z.string().trim().max(9).optional().default(""),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().max(120).optional().default(""),
  business_type: z.enum(BUSINESS_TYPES).optional().default("restaurante"),
  business_types: z.array(z.enum(BUSINESS_TYPES)).min(1).max(3).optional(),
});

export const signupPresencaTenant = createServerFn({ method: "POST" })
  .inputValidator((d) => SignupInput.parse(d))
  .handler(async ({ data }) => {
    const { getClientIp, consumeRateLimit } = await import("@/lib/rate-limit.server");
    const ip = getClientIp();
    const rateCheck = consumeRateLimit({
      key: `signup:${ip}`,
      maxAttempts: 5,
      windowSeconds: 3600, // 1 hr
    });
    if (!rateCheck.allowed) {
      const mins = Math.ceil((rateCheck.resetInSeconds || 60) / 60);
      throw new Error(`Limite de cadastros excedido para seu endereço IP. Por favor, aguarde ${mins} minuto(s).`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rawSlug = data.slug || data.name;
    const slug = slugify(rawSlug);
    if (slug.length < 3) throw new Error("Endereço da loja inválido.");
    if (RESERVED_SLUGS.has(slug)) throw new Error("Esse endereço é reservado.");

    // Slug livre?
    const { data: taken } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (taken) throw new Error("Esse endereço de loja já está em uso. Escolha outro.");

    // Cria usuário — e-mail NÃO confirmado: o acesso ao painel só é liberado
    // depois que o lojista clicar no link de confirmação enviado por e-mail.
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: false,
      user_metadata: { full_name: data.full_name || data.name },
    });
    if (authErr || !created?.user) {
      const msg = authErr?.message ?? "Falha ao criar usuário.";
      if (/already registered|already exists|duplicate/i.test(msg)) {
        throw new Error("Já existe uma conta com esse e-mail. Faça login para continuar.");
      }
      throw new Error(msg);
    }
    const userId = created.user.id;

    // Resolve lista de tipos de negócio (1 a 3)
    const resolvedTypes = data.business_types && data.business_types.length > 0
      ? data.business_types.slice(0, 3)
      : [data.business_type];

    // Cria tenant no plano "pro" (Trial Reverso de 14 dias)
    const whatsappDigits = data.whatsapp.replace(/\D/g, "");
    const cepDigits = data.cep.replace(/\D/g, "");
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        slug,
        name: data.name,
        whatsapp: whatsappDigits,
        city: data.city || "",
        state: data.state || "",
        address: data.address || "",
        neighborhood: data.neighborhood || "",
        cep: cepDigits ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : "",
        logo_letter: data.name.charAt(0).toUpperCase(),
        plan: "pro",
        status: "ativa",
        active: true,
        theme_from: "#FF6A1F",
        theme_to: "#FF9A3C",
        business_types: resolvedTypes,
      } as never)
      .select("id, slug")
      .single();

    if (tErr || !tenant) {
      // rollback do user auth se falhou
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw new Error(tErr?.message ?? "Falha ao criar loja.");
    }

    // Calcula 14 dias de trial PRO
    const now = new Date();
    now.setUTCDate(now.getUTCDate() + 14);
    const trialDueDate = now.toISOString().slice(0, 10);

    // Resolve o ID do plano Pro no banco
    const { data: proPlan } = await supabaseAdmin
      .from("plans")
      .select("id, monthly_price")
      .eq("slug", "pro")
      .maybeSingle();

    const proPlanId = (proPlan as { id?: string } | null)?.id;
    const proAmount = Number((proPlan as { monthly_price?: number } | null)?.monthly_price ?? 79.8);

    if (proPlanId) {
      // Cria/Atualiza assinatura com status "teste" (14 dias do Plano PRO)
      const { data: existingSub } = await supabaseAdmin
        .from("tenant_subscriptions")
        .select("id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      let subId: string | null = (existingSub as { id?: string } | null)?.id ?? null;

      if (subId) {
        await supabaseAdmin
          .from("tenant_subscriptions")
          .update({
            plan_id: proPlanId,
            status: "teste",
            amount: proAmount,
            due_date: trialDueDate,
            notes: "Trial Reverso de 14 dias do Plano PRO liberado no cadastro",
          })
          .eq("id", subId);
      } else {
        const { data: createdSub } = await supabaseAdmin
          .from("tenant_subscriptions")
          .insert({
            tenant_id: tenant.id,
            plan_id: proPlanId,
            status: "teste",
            billing_period: "mensal",
            amount: proAmount,
            due_date: trialDueDate,
            grace_days: 0,
            auto_block_enabled: false,
            notes: "Trial Reverso de 14 dias do Plano PRO liberado no cadastro",
          })
          .select("id")
          .single();

        subId = (createdSub as { id?: string } | null)?.id ?? null;
      }

      if (subId) {
        await supabaseAdmin.from("subscription_events").insert({
          tenant_id: tenant.id,
          subscription_id: subId,
          event_type: "trial_started",
          description: "Degustação total do Plano PRO iniciada por 14 dias (Trial Reverso)",
          metadata: { due_date: trialDueDate, amount: proAmount },
          created_by: userId,
        });
      }
    }

    // Vincula tenant ao profile (trigger handle_new_user já criou o profile)
    await supabaseAdmin.from("profiles").update({ tenant_id: tenant.id }).eq("id", userId);

    // Owner role
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, tenant_id: tenant.id, role: "owner" });
    if (rErr) {
      console.error("signup: failed to insert owner role", rErr);
    }

    return {
      tenant_id: tenant.id,
      slug: tenant.slug,
      email: data.email.toLowerCase(),
      requires_email_confirmation: true,
    };
  });
