# Rascunho automático do pedido no PDV

## O que muda
- Cada item lançado, removido ou alterado no PDV é salvo automaticamente no aparelho.
- Também são salvos: nome do cliente, WhatsApp, modo (balcão/entrega/mesa), mesa, observação, pagamento e endereço/taxa de entrega.
- Ao sair do PDV (ex.: aceitar um pedido) e voltar, a comanda reaparece exatamente como estava, com um aviso discreto "Pedido em andamento restaurado".
- Botão "Limpar comanda" para descartar o rascunho manualmente (com confirmação).
- Ao lançar o pedido com sucesso, o rascunho é apagado.
- Rascunho separado por loja (quem troca de loja não vê comanda de outra) e expira após 24h.

## Detalhes técnicos
- `src/routes/admin.pdv.tsx`: chave `menuzin:pdv-draft:<tenantId>`; restaurar em `useEffect` após `tenantData` carregar (evita erro de hidratação), com flag `hydrated` para não sobrescrever antes de restaurar; salvar em `useEffect` com debounce ~300ms sobre cart + campos do cliente/endereço; `try/catch` no localStorage; versão no payload (`v:1`) e `savedAt` para expirar.
- Limpar a chave no sucesso de `createManualOrder` (onde hoje faz `setCart([])`) e no botão "Limpar comanda".
- Sem mudanças no banco.
