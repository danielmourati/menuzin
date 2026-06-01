// Planos estáticos exibidos na landing page. Conteúdo institucional —
// não pertence ao banco.
export const plans = [
  {
    id: "start",
    name: "Start",
    price: 0,
    features: [
      "Até 50 produtos",
      "Catálogo público",
      "Pedidos via WhatsApp",
      "Personalização básica",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    features: [
      "Produtos ilimitados",
      "Dashboard completo",
      "Status de pedidos",
      "Cupons simples",
      "QR Code para mesas",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: 149,
    features: [
      "Login de clientes",
      "Pagamento online",
      "WhatsApp automático",
      "Entregadores",
      "Integração com PDV",
    ],
  },
] as const;
