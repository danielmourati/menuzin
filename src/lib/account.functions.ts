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
