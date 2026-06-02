# Impressão silenciosa via QZ Tray

## Problema atual

`PrintOrderButton` abre um `<Dialog>` com `<PrintableOrder>` renderizado em HTML e dispara `window.print()`. Isso:
- Mostra a prévia visual do cupom (a imagem que aparece no print).
- Abre o diálogo de impressão do navegador (Ctrl+P).
- Não usa o QZ Tray, então a impressora térmica recebe um raster pesado em vez de texto ESC/POS.

Já temos toda a infraestrutura para fazer direto: `ensureQzConnected`, `printQzTextTest` (envia texto cru com encoding CP860) e `buildReceipt` (gera exatamente o texto monoespaçado do cupom).

## Mudanças

### 1. `src/lib/qz-tray.ts`
Adicionar `printQzReceipt(printerName, text, opts?)` que:
- Garante conexão (`ensureQzConnected`).
- Resolve a impressora alvo (parâmetro → default do SO → erro claro).
- Cria config com `encoding: "CP860"`.
- Envia `[text, "\n".repeat(feedLines), cutCommand?]` — onde:
  - `cutCommand` = `\x1Dm` (partial) ou `\x1DV\x00` (full) conforme `cut_type`.
  - `feedLines` vem das settings.
- Reaproveita `QzNotRunningError` para a UI mostrar "QZ Tray fechado".

### 2. `src/components/orders/PrintOrderButton.tsx` (rewrite)
Substituir todo o fluxo de modal + `window.print()` por:
- Botão único "Imprimir" sem `<Dialog>`.
- `onClick` → estado `printing` → chama `printOrderViaQz(order, settings, storeInfo)`.
- Em caso de sucesso: toast "Cupom enviado para <impressora>".
- Em `QzNotRunningError`: toast destrutivo "QZ Tray não está aberto. Abra o app e tente novamente."
- Em "impressora não configurada": toast com link para `/admin/configuracoes/impressora`.
- Remover imports de `Dialog`, `createPortal`, `PrintableOrder`.

Helper novo `src/lib/print-order.ts`:
```ts
export async function printOrderViaQz(order, settings, storeInfo) {
  const cols = columnsFor(settings.paper_width);
  const text = buildReceipt(order, cols, settings, storeInfo);
  await printQzReceipt(settings.printer_name, text, {
    feedLines: settings.feed_lines,
    cutType: settings.cut_type,
  });
}
```

### 3. Fallback opcional (preview manual)
Manter uma opção secundária só para casos onde o QZ Tray não está disponível: um item no menu dropdown do `OrderDetailsDrawer` chamado "Ver prévia em texto" que abre um `<Dialog>` mostrando o texto puro do `buildReceipt` (sem `window.print()`). Isso garante que o usuário ainda consegue revisar o cupom sem forçar o diálogo do navegador.

### Pontos não afetados
- `PrintableOrder` continua existindo para a tela de **Configurações → Impressora** (prévia visual lá faz sentido).
- `printer_name` segue como configuração-chave; se vazio, usamos a default do SO.
- Conexão global do `PrintServerProvider` continua valendo: `ensureQzConnected` reaproveita a sessão já aberta.

## Resultado esperado
- Clicar em "Imprimir" no card/pedido envia o cupom direto à impressora térmica via QZ Tray, sem abrir prévia nem caixa de diálogo de impressão.
- Erros (QZ fechado, impressora não configurada) viram toasts acionáveis.
- A prévia visual fica restrita à tela de configurações.
