## Plano

### 1) Corrigir erro no checkout Presença (anexo 1)

Hoje `ensureOrder()` lança erro para lojas Presença. O `handleSelectMethod` já captura e mostra a mensagem correta, mas `finalize()` (chamado pelos métodos offline: dinheiro, cartão na entrega, pix manual) também chama `ensureOrder()` — e cai no `catch` genérico "Não foi possível registrar o pedido. Tente novamente." (linha 604).

**Correção em `src/components/storefront/CartDrawer.tsx`:**
- No topo de `finalize()`, se `isPresencaOnly`, chamar `openWhatsappPresenca()` e retornar imediatamente (sem tentar `ensureOrder` nem gravar no banco).
- Adicionalmente, blindar os botões: no `step === "payment-when"` / `payment-method` / `review`, para Presença já não deveríamos chegar — mas o guard em `finalize` fecha a porta.

### 2) "Ver no mapa" funcional (anexo 2)

Botão em `CartDrawer.tsx` linha 1405 (bloco de retirada) hoje é inerte.

**Correção:** transformar em `<a target="_blank" rel="noreferrer">` apontando para `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenantAddress)}` — abre Google Maps com o endereço da loja. Mantém o mesmo estilo/ícone.

### Escopo
Apenas `src/components/storefront/CartDrawer.tsx`. Sem alterações de schema, server functions ou outras rotas.