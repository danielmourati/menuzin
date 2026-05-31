export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const statusLabel: Record<string, string> = {
  novo: "Novo pedido",
  confirmado: "Confirmado",
  preparo: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  pronto_retirada: "Pronto para retirada",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const modeLabel: Record<string, string> = {
  entrega: "Entrega",
  retirada: "Retirada",
  consumo_local: "Consumo no local",
};

export const statusColor: Record<string, string> = {
  novo: "bg-primary/15 text-primary",
  confirmado: "bg-chart-4/15 text-chart-4",
  preparo: "bg-warning/20 text-warning-foreground",
  saiu_entrega: "bg-chart-4/15 text-chart-4",
  pronto_retirada: "bg-success/15 text-success",
  finalizado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/15 text-destructive",
};
