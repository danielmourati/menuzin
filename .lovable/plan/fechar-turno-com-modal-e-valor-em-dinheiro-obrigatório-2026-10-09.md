# Fechar turno com modal e valor em dinheiro obrigatório

## O que muda para o lojista
- O cartão "Fechar caixa" passa a ter só uma explicação e o botão **Fechar turno** (some o campo solto na tela).
- Ao clicar em **Fechar turno** abre um modal "Fechar turno" com:
  - Texto: "Conte o dinheiro físico da gaveta e digite o valor. O sistema compara só depois."
  - Campo **Dinheiro contado na gaveta** com máscara de real (R$ 0,00): ao digitar `15050` aparece `R$ 150,50`. Teclado numérico no celular.
  - Botões **Cancelar** e **Confirmar fechamento**.
- O valor é obrigatório: o botão Confirmar fica desativado enquanto o campo estiver vazio. Se o lojista contou zero, ele digita `R$ 0,00` (campo preenchido) e confirma.
- O modal já funciona como confirmação (substitui a pergunta "Fechar o turno?" atual), mostrando um aviso "Depois de fechar não é possível alterar".
- Após fechar, o modal fecha e o cartão "Resultado do fechamento" (Bateu / Sobra / Falta) aparece como hoje. O fechamento continua cego: o esperado só aparece depois.
- O campo é limpo sempre que o modal abre ou é cancelado.

## Detalhes técnicos
- `src/lib/masks.ts`: nova `maskBRL(value)` (só dígitos, centavos, formatação pt-BR com "R$") e `parseBRL(masked)` que devolve número; reaproveitável no PDV/sangria depois.
- `src/routes/admin.caixa.tsx`: novo estado `closeOpen`; botão abre o `Dialog` já importado; input com `maskBRL`; mutação `closeM` existente; fecha o modal no `onSuccess`; remove o `confirmDialog` do fechamento.
- `src/lib/cash.functions.ts`: validação do servidor já exige número entre 0 e 1.000.000, sem alteração (a obrigatoriedade é garantida na tela, pois o campo só gera número quando preenchido).
- Sem mudanças no banco.
- Fora do escopo: máscara nos campos de fundo de troco e sangria (posso aplicar a mesma máscara neles se quiser).
