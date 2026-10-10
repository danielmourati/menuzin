# Despacho: último entregador pré-selecionado + botão condicionado

## Objetivo
No modal "Despachar Pedido" (`src/components/orders/DispatchOrderModal.tsx`, usado em `/admin/pedidos`):
1. Pré-selecionar sempre o **último entregador acionado** em uma entrega, em vez de "[Sem Entregador]".
2. "[Sem Entregador]" vira a **última opção** da lista.
3. O botão principal "Despachar Pedido" fica **ativo somente quando há entregador selecionado**; com "[Sem Entregador]" escolhido, aparece um botão separado e explícito "Despachar sem entregador".

## Alterações

### 1. `src/lib/drivers.functions.ts` — novo server function
- `getLastDispatchedDriver`: autenticada (`requireSupabaseAuth`), resolve tenant via `tryResolveEffectiveTenantId`, consulta `orders` com `driver_id` não nulo, ordena por `created_at` desc, limit 1, retorna `{ driverId, driverName }` (null se não houver). Erros/ausência de tenant retornam nulls silenciosamente.

### 2. `src/components/orders/DispatchOrderModal.tsx`
- Nova `useQuery` (`queryKey: ["last-dispatch-driver"]`, `enabled: isOpen`) buscando o último entregador acionado.
- Lógica de pré-seleção no `useEffect` (ao abrir), nesta ordem:
  1. Seleção atual já válida → mantém;
  2. `order.driverId` (pedido já atribuído) → usa;
  3. Último entregador acionado (se ainda ativo na lista) → usa;
  4. Primeiro entregador ativo → usa;
  5. Caso contrário → `[Sem Entregador]`.
- Reordenar itens do `<Select>`: entregadores primeiro, `__none__` por último.
- Rodapé:
  - Com entregador real selecionado: botões atuais "Despachar e Enviar no WhatsApp" e "Apenas Despachar" (desabilitados se nada selecionado).
  - Com `__none__`: botão verde principal é substituído por um botão secundário (outline) "Despachar sem entregador" — escolha explícita, sem destaque primário.

### 3. `src/routes/admin.pedidos.tsx`
- Após o despacho com entregador, invalidar a query `["last-dispatch-driver"]` para o próximo pedido já abrir com o entregador recém-usado.

## Verificação
- Typecheck (`tsgo`).
- Playwright no painel de pedidos: abrir modal de despacho e confirmar pré-seleção do último entregador, posição de "[Sem Entregador]" no fim da lista e comportamento dos botões.
