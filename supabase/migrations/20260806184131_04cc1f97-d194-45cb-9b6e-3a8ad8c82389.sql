UPDATE public.plans
SET active = false
WHERE slug = 'start';

UPDATE public.plans
SET features = '[
  "Tudo do Presença",
  "Produtos e categorias ilimitados",
  "Painel de pedidos (entrega e retirada)",
  "Status do pedido em tempo real",
  "Cadastro de clientes",
  "Adicionais simples e taxa fixa por bairro",
  "Cupons básicos e impressão manual",
  "Relatórios básicos",
  "Pagamento online (Mercado Pago)",
  "Impressão automática (cozinha + entrega)",
  "Adicionais avançados, combos e pizza multi-sabor",
  "Cupons avançados, upsell e recuperação",
  "Taxa de entrega por distância",
  "Relatórios completos",
  "Múltiplos usuários",
  "Destaque no Guia Menuzin",
  "Suporte prioritário",
  "Sem marca Menuzin"
]'::jsonb
WHERE slug = 'pro';