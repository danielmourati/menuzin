// Sinal leve "chegou pedido" para o painel da loja (só o id, sem dados do cliente).
// O painel reage buscando os pedidos de forma autenticada (RLS).
export async function signalNewOrder(tenantId: string, orderId: string) {
  try {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !key) return;
    const headers: Record<string, string> = { "Content-Type": "application/json", apikey: key };
    if (!key.startsWith("sb_")) headers["Authorization"] = `Bearer ${key}`;
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [{ topic: `tenant-orders:${tenantId}`, event: "order", payload: { id: orderId } }],
      }),
    });
  } catch (e) {
    console.warn("[order-signal] falha ao sinalizar pedido", e);
  }
}
