# Remover o prefixo `/loja` do slug do tenant

## Situação atual

A migração já foi feita parcialmente:

- As rotas públicas novas já vivem na raiz: `src/routes/$slug.tsx`, `$slug.pedido-confirmado.tsx`, `$slug.acompanhar.$orderId.tsx`.
- As rotas antigas `src/routes/loja.$slug*.tsx` ainda existem, mas funcionam apenas como **redirect 301** para `/$slug` (compatibilidade com links antigos).
- `src/lib/reserved-slugs.ts` já reserva `"loja"` como slug proibido para novos tenants.

O que **não** foi atualizado e ainda mostra `/loja/...`:

1. `src/routes/platform.tenants.novo.tsx` (linha 62) — preview do slug exibe `seudominio.com.br/loja/{slug}`.
2. `src/components/admin/AdminLayout.tsx` (linha 206) — onboarding mostra `menuzin.app/loja/` antes do input.
3. As rotas legadas `loja.$slug*.tsx` continuam ocupando espaço no route tree.

## O que fazer

### 1. Atualizar previews de URL na UI
- Em `platform.tenants.novo.tsx`, trocar `seudominio.com.br/loja/${slug}` por `seudominio.com.br/${slug}` (e o placeholder equivalente).
- Em `AdminLayout.tsx` (onboarding de criação de loja), trocar o prefixo `menuzin.app/loja/` por `menuzin.app/`.
- Conferir outros pontos que ainda mencionem `/loja/` na UI (toasts, copy de configurações, links "Ver loja pública") e ajustar para a URL nova.

### 2. Decidir o destino das rotas legadas
Recomendado: **manter** os três arquivos `loja.$slug*.tsx` apenas como redirects, pois links antigos compartilhados por clientes/WhatsApp continuam funcionando. Eles já não geram UI nem custo perceptível.

Alternativa (se preferir limpar): deletar `loja.$slug.tsx`, `loja.$slug.pedido-confirmado.tsx`, `loja.$slug.acompanhar.$orderId.tsx`. Links antigos passam a cair em 404.

→ **Pergunta para você:** manter os redirects de compatibilidade ou remover de vez?

### 3. Validação rápida
- Abrir `/platform/tenants/novo` e confirmar que o preview mostra `seudominio.com.br/{slug}`.
- Abrir o onboarding de criação de loja e confirmar o prefixo novo.
- Acessar uma loja existente em `/{slug}` e (se mantidos) em `/loja/{slug}` para confirmar o redirect.

## Arquivos afetados
- `src/routes/platform.tenants.novo.tsx` (edit)
- `src/components/admin/AdminLayout.tsx` (edit)
- Opcional: deletar `src/routes/loja.$slug.tsx`, `src/routes/loja.$slug.pedido-confirmado.tsx`, `src/routes/loja.$slug.acompanhar.$orderId.tsx`.

Sem mudanças de banco, server functions ou lógica de negócio.
