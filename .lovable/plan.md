## Mudanças solicitadas

### 1. Remover E-mail e CPF/CNPJ do formulário do cliente
**Arquivo:** `src/components/storefront/CartDrawer.tsx` (etapa `step === "customer"`, linhas ~877–882)
- Remover os blocos `<Label>E-mail</Label>` + `Input` e `<Label>CPF/CNPJ</Label>` + `Input`.
- Remover estados/efeitos `email`, `setEmail`, `doc`, `setDoc` apenas no que se refere à UI; manter envio dos campos como string vazia/null no `createOrder` (e remover validações que dependam deles).
- No `requestPayment` (linha ~387) onde o `doc` é usado para `identification.CPF`, manter fallback `"11111111111"` (já existe) e parar de ler `doc` do form (passa direto o fallback).
- Manter `clearForm` funcionando (apenas remover `setEmail("")`/`setDoc("")` se restarem referências).

### 2. Reposicionar botão "Limpar" para não sobrepor o X de fechar
**Arquivo:** `src/components/storefront/CartDrawer.tsx`, componente `Header` (linhas 477–487)
- O `SheetContent` da shadcn já renderiza um botão X fixo no canto superior direito. Hoje o `right={<ClearBtn />}` cai exatamente embaixo desse X.
- Adicionar `pr-10` (ou `mr-9`) no container do `Header` para reservar espaço do X, OU mover o `ClearBtn` para a linha do título (logo após o `<h2>`), no lado esquerdo. **Proposta:** mover `ClearBtn` para ficar ao lado do título (mesma linha do botão "voltar"), assim:
  ```
  [←] Insira seus dados  ⌫ Limpar          [X]
  ```
- Aplica automaticamente a todas as etapas que usam `right={<ClearBtn />}` (endereço, mesa, customer, review).

### 3. Scroller no modal de pedido em telas < desktop / tablets
**Arquivo:** `src/components/orders/OrderDetailsDrawer.tsx`
- O `ScrollArea` já existe (linha 126), mas o problema no print é que em ~1024px o footer com `Aceitar Pedido / Recusar` empurra o conteúdo e o scroll some por falta de altura disponível.
- Ajustar `DialogContent` para usar altura útil em tablets/mobile: trocar `max-h-[92dvh]` por `h-[92dvh] md:h-auto md:max-h-[92dvh]` para garantir altura fixa abaixo de desktop, dando ao `ScrollArea` espaço efetivo para rolar.
- Garantir que `ScrollArea` use `h-full` em vez de `flex-1` quando `h-[92dvh]` está ativo (manter `flex-1 min-h-0` funciona; apenas confirmar).
- Tornar o footer mais compacto em telas pequenas (já está em `p-3`, manter).

### 4. Botão de impressão/reimpressão da comanda da cozinha
- Já existe `PrintKitchenButton` em `OrderCard.tsx` (linha 177) e `OrderDetailsDrawer.tsx` (linha 251) como ícone. **Refinamento:** no `OrderDetailsDrawer` exibir o botão com label visível (não só ícone) para destaque, ao lado do "Imprimir pedido completo":
  ```
  [🖨 Imprimir pedido completo]  [👨‍🍳 Imprimir cozinha]  [Fechar]
  ```
  Trocar `size="icon" className="h-10 w-10..."` por `className="flex-1 min-w-[140px] bg-amber-600..."` no `OrderDetailsDrawer.tsx` linha 251.
- No `OrderCard.tsx` manter como ícone (espaço apertado).
- O label do componente já alterna entre "Imprimir cozinha" e "Reimprimir cozinha" conforme `order.status === "novo"` — sem mudança.

### 5. Verificação de status da impressora + tratar demora/falha
**Arquivos:** `src/lib/qz-tray.ts`, `src/lib/print-kitchen.ts`, `src/lib/print-order.ts`, `src/components/orders/PrintKitchenButton.tsx`, `src/components/orders/PrintOrderButton.tsx`

- **Pré-check de status no QZ Tray:** adicionar nova função `getQzPrinterStatus(printerName)` em `qz-tray.ts` que usa `qz.printers.startListening()` + `qz.printers.getStatus()` (API nativa do QZ) para detectar `OFFLINE`, `PAPER_OUT`, `PAPER_JAM`, etc. Se indisponível na versão do QZ, faz fallback para `qz.printers.find(printerName)` — se não retornar o nome, marca como "não encontrada".
- **Timeout no envio:** envolver `qz.print()` dentro de `printQzReceipt` com `Promise.race([print, timeout(15000)])`. Em timeout, lança `QzPrintTimeoutError` (nova classe).
- **Tratamento na UI (`PrintKitchenButton` e `PrintOrderButton`):**
  1. Antes de `printKitchenTicket`/`printOrder`, chamar `getQzPrinterStatus(printer.printer_name)`. Se status indicar falha, mostra toast vermelho com causa específica ("Impressora offline", "Sem papel", "Impressora não encontrada no QZ Tray") + ação "Tentar novamente".
  2. Mostrar um `toast.loading("Enviando para impressora...")` ao iniciar, atualizando para success/error ao concluir (sonner `toast.promise`).
  3. Capturar `QzPrintTimeoutError` separadamente: "Demora ao imprimir — verifique a impressora" com ação "Tentar novamente".

### Resumo de arquivos a editar
- `src/components/storefront/CartDrawer.tsx` — itens 1 e 2
- `src/components/orders/OrderDetailsDrawer.tsx` — itens 3 e 4
- `src/lib/qz-tray.ts` — item 5 (status + timeout)
- `src/lib/print-kitchen.ts` e `src/lib/print-order.ts` — propagar status/timeout
- `src/components/orders/PrintKitchenButton.tsx` e `src/components/orders/PrintOrderButton.tsx` — pré-check + toast.promise + tratamento de timeout

Sem mudanças de backend, schema, RLS ou edge functions.