// Planos estáticos exibidos na landing page. Conteúdo institucional —
// não pertence ao banco (a fonte da verdade em runtime é public.plans).
export const plans = [
  {
    id: "presenca",
    name: "Presença",
    price: 0,
    highlight: false,
    tagline: "Sua vitrine no Guia Menuzin, 100% gratuita para sempre.",
    cta: "Cadastrar grátis",
    features: [
      "Página no Guia Menuzin",
      "Até 20 produtos e 4 categorias",
      "Cardápio digital com QR Code",
      "Recebimento no WhatsApp",
      "Estatísticas básicas",
      "Marca Menuzin visível",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 79.8,
    highlight: true,
    tagline: "14 Dias Grátis (Degustação Total)! Automação completa, impressão e gestão.",
    cta: "Testar Grátis por 14 Dias (Plano PRO)",
    features: [
      "14 dias de teste grátis (Sem pedir cartão)",
      "Tudo do Presença e produtos ilimitados",
      "Painel de pedidos Kanban (entrega, retirada e salão)",
      "Impressão automática (cozinha + entrega)",
      "Pagamento online via Pix Mercado Pago",
      "Adicionais avançados, combos e pizza multi-sabor",
      "Cupons avançados, upsell e recuperação",
      "Taxa de entrega por distância",
      "Relatórios de faturamento completos",
      "Múltiplos usuários e impressoras",
      "Destaque no Guia Menuzin",
      "Suporte prioritário via WhatsApp",
      "Sem marca Menuzin",
    ],
  },
] as const;

