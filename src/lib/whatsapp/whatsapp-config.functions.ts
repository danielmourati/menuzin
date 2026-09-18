import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkEvolutionConnectionState, sendEvolutionTextMessage } from "./evolution-client.server";

export const getEvolutionConfigStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const status = await checkEvolutionConnectionState();
    const apiUrl = process.env["EVOLUTION_API_URL"] || "";
    const instance = process.env["EVOLUTION_INSTANCE_NAME"] || "menuzin";
    const hasApiKey = !!(process.env["EVOLUTION_API_KEY"] || "").trim();

    return {
      connected: status.connected,
      state: status.state,
      apiUrl: apiUrl ? `${apiUrl.slice(0, 20)}...` : "Não configurada",
      instance,
      hasApiKey,
      error: status.error,
    };
  });

const TestMessageInput = z.object({
  number: z.string().min(8, "Informe um número de telefone com DDD válido"),
  message: z.string().min(1, "Digite a mensagem de teste"),
});

export const sendEvolutionTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TestMessageInput.parse(d))
  .handler(async ({ data }) => {
    const res = await sendEvolutionTextMessage({
      number: data.number,
      text: data.message,
    });

    if (!res.success) {
      throw new Error(res.error || "Falha ao enviar mensagem de teste via Evolution API.");
    }

    return {
      success: true,
      messageId: res.messageId,
    };
  });
