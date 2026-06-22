import type { OrderMode, OrderStatus } from "@/lib/domain-types";

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const statusLabel: Record<string, string> = {
  novo: "Novo pedido",
  aceito: "Aceito",
  preparo: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  pronto_retirada: "Pronto para retirada",
  servido: "Entregue na mesa",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const modeLabel: Record<string, string> = {
  entrega: "Entrega",
  retirada: "Retirada",
  consumo_local: "Consumo no local",
};

export const statusColor: Record<string, string> = {
  novo: "bg-primary/15 text-primary border-primary/30",
  aceito: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  preparo: "bg-warning/20 text-warning-foreground border-warning/40",
  saiu_entrega: "bg-blue-500/15 text-blue-600 border-blue-400/30",
  pronto_retirada: "bg-success/15 text-success border-success/30",
  servido: "bg-success/15 text-success border-success/30",
  finalizado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
};

export const paymentStatusLabel: Record<string, string> = {
  pending: "Aguardando pagamento",
  approved: "Aprovado",
  rejected: "Recusado",
  refunded: "Estornado",
  manual: "Pagar na entrega",
};

export const paymentStatusColor: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  refunded: "bg-muted text-muted-foreground",
  manual: "bg-muted text-muted-foreground",
};

// Fluxo simplificado: "Aceitar" pula direto para "preparo".
// "aceito" continua como destino válido só para retrocompat com pedidos legados.
export function nextStatuses(mode: OrderMode, current: OrderStatus): OrderStatus[] {
  if (current === "finalizado" || current === "cancelado") return [];

  const flowMap: Record<OrderMode, Partial<Record<OrderStatus, OrderStatus[]>>> = {
    entrega: {
      novo: ["preparo", "cancelado"],
      aceito: ["preparo", "cancelado"],
      preparo: ["saiu_entrega", "cancelado"],
      saiu_entrega: ["finalizado"],
      pronto_retirada: [],
      servido: [],
    },
    retirada: {
      novo: ["preparo", "cancelado"],
      aceito: ["preparo", "cancelado"],
      preparo: ["pronto_retirada", "cancelado"],
      pronto_retirada: ["finalizado"],
      saiu_entrega: [],
      servido: [],
    },
    consumo_local: {
      novo: ["preparo", "cancelado"],
      aceito: ["preparo", "cancelado"],
      preparo: ["servido", "cancelado"],
      servido: ["finalizado"],
      saiu_entrega: [],
      pronto_retirada: [],
    },
  };

  return flowMap[mode]?.[current] ?? [];
}

// Timeline completa (admin) — inclui "Pedido enviado".
export function getTimelineSteps(mode: OrderMode): { key: OrderStatus; label: string }[] {
  if (mode === "entrega") {
    return [
      { key: "novo", label: "Pedido enviado" },
      { key: "aceito", label: "Pedido aceito" },
      { key: "preparo", label: "Em preparo" },
      { key: "saiu_entrega", label: "Saiu para entrega" },
      { key: "finalizado", label: "Entregue" },
    ];
  }
  if (mode === "retirada") {
    return [
      { key: "novo", label: "Pedido enviado" },
      { key: "aceito", label: "Pedido aceito" },
      { key: "preparo", label: "Em preparo" },
      { key: "pronto_retirada", label: "Pronto para retirada" },
      { key: "finalizado", label: "Retirado" },
    ];
  }
  // consumo_local
  return [
    { key: "novo", label: "Pedido enviado" },
    { key: "aceito", label: "Pedido aceito" },
    { key: "preparo", label: "Em preparo" },
    { key: "servido", label: "Entregue na mesa" },
    { key: "finalizado", label: "Finalizado" },
  ];
}

// Timeline simplificada para o cliente — sem a etapa "Pedido enviado".
export function getCustomerTimelineSteps(mode: OrderMode): { key: OrderStatus; label: string }[] {
  return getTimelineSteps(mode).filter((s) => s.key !== "novo");
}

// Retorna index do status atual na timeline.
export function getTimelineIndex(
  mode: OrderMode,
  status: OrderStatus,
  steps?: { key: OrderStatus; label: string }[],
): number {
  const list = steps ?? getTimelineSteps(mode);
  const idx = list.findIndex((s) => s.key === status);
  if (idx !== -1) return idx;
  // No timeline do cliente "novo" não existe — tratamos como etapa 0 ("aceito").
  if (status === "novo" && list[0]?.key === "aceito") return 0;
  return -1;
}

// Tempo decorrido desde uma data
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)} dia(s)`;
}

// Formata data/hora completa em PT-BR
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Formata apenas hora
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Gera link WhatsApp com mensagem pré-formatada
export function whatsappOrderMessage(
  type: "aceito" | "preparo" | "saiu_entrega" | "pronto_retirada" | "cancelado" | "conversa",
  opts: { cliente: string; numero: number; loja: string; motivo?: string }
): string {
  const msgs: Record<string, string> = {
    aceito: `Olá, ${opts.cliente}! Seu pedido #${opts.numero} foi aceito pela ${opts.loja} e em breve entrará em preparo. 🍔`,
    preparo: `Olá, ${opts.cliente}! Seu pedido #${opts.numero} está em preparo. Logo estará pronto! ⏳`,
    saiu_entrega: `Olá, ${opts.cliente}! Seu pedido #${opts.numero} saiu para entrega. Aguarde em casa! 🛵`,
    pronto_retirada: `Olá, ${opts.cliente}! Seu pedido #${opts.numero} está pronto para retirada na ${opts.loja}. 🎉`,
    cancelado: `Olá, ${opts.cliente}. Seu pedido #${opts.numero} foi cancelado pela ${opts.loja}. Motivo: ${opts.motivo ?? "não informado"}.`,
    conversa: `Olá, ${opts.cliente}! Fala com a gente sobre o pedido #${opts.numero}.`,
  };
  return msgs[type] ?? "";
}
