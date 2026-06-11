import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const StrongPassword = z
  .string()
  .min(8, "Mínimo de 8 caracteres.")
  .max(72, "Máximo de 72 caracteres.")
  .regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula.")
  .regex(/[a-z]/, "Inclua ao menos uma letra minúscula.")
  .regex(/[0-9]/, "Inclua ao menos um número.")
  .regex(/[^A-Za-z0-9]/, "Inclua ao menos um caractere especial.");

const Input = z.object({ new_password: StrongPassword });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", userId);
    return { ok: true };
  });

// ===== Dados do administrador (auto-edição) =====

export const getMyAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    return {
      email: prof?.email ?? u.user?.email ?? "",
      full_name: prof?.full_name ?? "",
    };
  });

const UpdateMyAccountInput = z.object({
  full_name: z.string().trim().min(2, "Informe o nome.").max(120).optional(),
  email: z.string().trim().email("E-mail inválido.").max(160).optional(),
  new_password: StrongPassword.optional(),
});

export const updateMyAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateMyAccountInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const authPatch: { email?: string; password?: string } = {};
    if (data.email) authPatch.email = data.email;
    if (data.new_password) authPatch.password = data.new_password;
    if (Object.keys(authPatch).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ...authPatch,
        email_confirm: !!data.email || undefined,
      } as never);
      if (error) throw new Error(error.message);
    }
    const profPatch: Record<string, unknown> = {};
    if (data.full_name) profPatch.full_name = data.full_name;
    if (data.email) profPatch.email = data.email;
    if (data.new_password) profPatch.must_change_password = false;
    if (Object.keys(profPatch).length) {
      await supabaseAdmin.from("profiles").update(profPatch).eq("id", userId);
    }
    return { ok: true };
  });
