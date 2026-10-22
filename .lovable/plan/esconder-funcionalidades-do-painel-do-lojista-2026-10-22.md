# Esconder funcionalidades do painel do lojista

Objetivo: simplificar o painel. Nada é apagado (dados, configurações e tabelas ficam intactos), e tudo pode ser religado depois mudando uma única chave.

## O que some do painel

- **Guia Menuzin** (menu "Guia Menuzin" / diretório)
- **WhatsApp API** (Configurações > WhatsApp)
- **Redes sociais** (campos/aba de redes sociais nas Configurações e Aparência)
- **Notificações Push** (menu "Notificações Push" e o card de aviso de pedido no celular em Configurações > Pedidos)
- **Promoções** (Configurações > Promoção, modais promocionais e a parte de promoções em "Cupons e Promoções")
- **Atendente IA** (menu, atalho flutuante de conversas e alerta de atendimento humano)
- Desativar notificações push do storefront (instalação app e aceite de cupons e promoções)

## Cupom de desconto — versão básica

O menu passa a se chamar "Cupons". A tela mantém só: código, tipo (% ou R$), valor, validade, ativo/inativo. Saem: divulgação avançada/mensagem personalizada, compartilhamento por WhatsApp e regras avançadas.

## Comportamento

- Itens somem do menu lateral e da tela de Configurações.
- Quem abrir o endereço direto é levado de volta para Pedidos.
- Na loja do cliente, o chat da IA e o banner de promoções deixam de aparecer; o botão de WhatsApp comum continua.
- O Guia público na página inicial **não** é alterado (só o painel do lojista). Se quiser tirar também, me avise.

## Detalhes técnicos

- Novo `src/lib/feature-flags.ts` com `HIDDEN_FEATURES` (guia, whatsappApi, social, push, promotions, aiAgent, advancedCoupons).
- `AdminLayout.tsx`: filtra navItems pelas flags; não monta FAB IA/HandoffAlert.
- Rotas `admin.diretorio`, `admin.notificacoes`, `admin.atendente-ia`, `admin.configuracoes.whatsapp`, `admin.configuracoes.promocao`: `beforeLoad` redireciona para `/admin/pedidos`.
- `admin.configuracoes.index.tsx`: oculta cards/links de WhatsApp, redes sociais, promoção; `admin.configuracoes.pedidos.tsx`: oculta card de push.
- `admin.cupons.tsx`: esconde modal avançado, compartilhamento e aba de promoções.
- Storefront `$slug.tsx`: não renderiza AiOrderChat nem modal promocional quando flag oculta.
- Servidor e banco sem mudanças.