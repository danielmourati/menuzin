## Objetivo
Atualizar o texto padrão das mensagens de pedido enviadas pelo WhatsApp para reforçar a origem Menuzin e incluir um badge de identidade ao final.

## Alterações
1. **Substituir cumprimento inicial** em todos os pontos que montam a mensagem de pedido:
   - `src/lib/whatsapp.ts` (`buildWhatsAppMessage`)
   - `src/components/storefront/CartDrawer.tsx` (`buildWhatsappOrderMessage`)
   
   Novo texto: `Olá! Vim pelo Menuzin e gostaria de fazer o pedido abaixo:`

2. **Incluir badge `[by Menuzin]`** ao final de cada mensagem, após o fechamento `Aguardo confirmação. Obrigado!`.

3. **Auditoria rápida** para garantir que não existam outras variações do cumprimento antigo espalhadas no código.

## Critérios de aceitação
- A mensagem enviada pelo WhatsApp começa com "Olá! Vim pelo Menuzin...".
- A mensagem termina com a linha `[by Menuzin]`.
- Build continua passando sem erros.
