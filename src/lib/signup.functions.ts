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

const SlugSchema = z
  .string()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9-]+$/)
  .refine((s) => !RESERVED_SLUGS.has(s), { message: "Esse endereço é reservado." });

const SignupInput = z.object({
  name: z.string().trim().min(2).max(120),
  slug: SlugSchema,
  whatsapp: z.string().trim().min(8).max(20),
  city: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().max(120).optional().default(""),
});

export const signupPresencaTenant = createServerFn({ method: "POST" })
  .inputValidator((d) => SignupInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const slug = slugify(data.slug);
    if (slug.length < 3) throw new Error("Endereço da loja inválido.");
    if (RESERVED_SLUGS.has(slug)) throw new Error("Esse endereço é reservado.");

    // Slug livre?
    const { data: taken } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (taken) throw new Error("Esse endereço de loja já está em uso. Escolha outro.");

    // Cria usuário
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
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

    // Cria tenant Presença
    const whatsappDigits = data.whatsapp.replace(/\D/g, "");
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        slug,
        name: data.name,
        whatsapp: whatsappDigits,
        city: data.city || "",
        logo_letter: data.name.charAt(0).toUpperCase(),
        plan: "presenca",
        status: "ativa",
        active: true,
        theme_from: "#FF6A1F",
        theme_to: "#FF9A3C",
      } as never)
      .select("id, slug")
      .single();

    if (tErr || !tenant) {
      // rollback do user auth se falhou
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw new Error(tErr?.message ?? "Falha ao criar loja.");
    }

    // Vincula tenant ao profile (trigger handle_new_user já criou o profile)
    await supabaseAdmin.from("profiles").update({ tenant_id: tenant.id }).eq("id", userId);

    // Owner role
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, tenant_id: tenant.id, role: "owner" });
    if (rErr) {
      // Não bloqueia — o admin pode logar e a plataforma pode corrigir depois.
      // Mas registra.
      console.error("signup: failed to insert owner role", rErr);
    }

    return {
      tenant_id: tenant.id,
      slug: tenant.slug,
      email: data.email.toLowerCase(),
    };
  });
