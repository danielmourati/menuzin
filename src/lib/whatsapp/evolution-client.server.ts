// Server-side module for Evolution API (WhatsApp REST API v1/v2) integration.
// Handles message dispatch, typing presence simulation, humanized delays, and instance status health checks.

export interface SendEvolutionMessageOptions {
  number: string;
  text: string;
  delayMs?: number;
}

export interface EvolutionResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EvolutionConnectionStatus {
  connected: boolean;
  state: "open" | "connecting" | "close" | "unknown";
  instanceName?: string;
  error?: string;
}

function getEvolutionEnv() {
  const apiUrl = (process.env["EVOLUTION_API_URL"] || "").trim().replace(/\/+$/, "");
  const apiKey = (process.env["EVOLUTION_API_KEY"] || "").trim();
  const instance = (process.env["EVOLUTION_INSTANCE_NAME"] || "menuzin").trim();

  return { apiUrl, apiKey, instance };
}

/**
  * Formata e limpa o número de telefone para o padrão E.164 do WhatsApp (ex: 5586999442282).
 */
export function formatWhatsappNumber(phone: string): string {
  let cleaned = (phone || "").replace(/\D/g, "");
  if (!cleaned) return "";

  // Se o número tem 10 ou 11 dígitos (padrão Brasil sem DDI 55), adiciona '55'
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = `55${cleaned}`;
  }

  return cleaned;
}

/**
 * Envia uma mensagem de texto simples via Evolution API com simulação de digitação humana (presence: composing).
 */
export async function sendEvolutionTextMessage(
  options: SendEvolutionMessageOptions,
): Promise<EvolutionResponse> {
  const { apiUrl, apiKey, instance } = getEvolutionEnv();

  const formattedNumber = formatWhatsappNumber(options.number);
  if (!formattedNumber || formattedNumber.length < 10) {
    return { success: false, error: "Número de WhatsApp inválido para envio." };
  }

  // Se as variáveis da Evolution API não estiverem configuradas, retorna fallback gracioso
  if (!apiUrl || !apiKey) {
    return {
      success: false,
      error: "Evolution API não configurada no servidor (EVOLUTION_API_URL / EVOLUTION_API_KEY).",
    };
  }

  const endpoint = `${apiUrl}/message/sendText/${instance}`;
  const delay = options.delayMs ?? Math.floor(1500 + Math.random() * 1000); // 1.5s - 2.5s delay humano

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: options.text,
        options: {
          delay,
          presence: "composing",
          linkPreview: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[EvolutionAPI] Erro ao enviar mensagem:", response.status, errorText);
      return {
        success: false,
        error: `Servidor Evolution API retornou status ${response.status}.`,
      };
    }

    const data = (await response.json()) as { key?: { id?: string }; message?: string };
    const messageId = data?.key?.id;

    return {
      success: true,
      messageId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha na conexão com a Evolution API.";
    console.error("[EvolutionAPI] Exceção na requisição:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Consulta o status atual de conexão da instância da Evolution API.
 */
export async function checkEvolutionConnectionState(): Promise<EvolutionConnectionStatus> {
  const { apiUrl, apiKey, instance } = getEvolutionEnv();

  if (!apiUrl || !apiKey) {
    return {
      connected: false,
      state: "unknown",
      instanceName: instance,
      error: "Credenciais da Evolution API não configuradas no servidor.",
    };
  }

  const endpoint = `${apiUrl}/instance/connectionState/${instance}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: apiKey,
      },
    });

    if (!response.ok) {
      return {
        connected: false,
        state: "close",
        instanceName: instance,
        error: `Servidor Evolution API retornou status ${response.status}.`,
      };
    }

    const data = (await response.json()) as {
      instance?: { state?: string };
      state?: string;
    };

    const rawState = (data?.instance?.state || data?.state || "unknown").toLowerCase();
    const isConnected = rawState === "open";

    return {
      connected: isConnected,
      state: isConnected ? "open" : rawState === "connecting" ? "connecting" : "close",
      instanceName: instance,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha na conexão com a Evolution API.";
    return {
      connected: false,
      state: "close",
      instanceName: instance,
      error: message,
    };
  }
}
