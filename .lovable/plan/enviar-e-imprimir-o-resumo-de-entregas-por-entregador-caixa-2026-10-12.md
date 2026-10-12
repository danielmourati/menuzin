# Enviar e imprimir o resumo de entregas por entregador (Caixa)

## O que muda para o lojista
No Caixa, em cada card de entregador (turno aberto, aba Entregadores, e no detalhe de turno fechado) aparecem dois botões:
- **Enviar no WhatsApp** — abre o WhatsApp (wa.me) já com a mensagem pronta para o número cadastrado do entregador. Se ele não tiver telefone, abre o WhatsApp para escolher o contato.
- **Imprimir resumo** — imprime na impressora térmica configurada (mesma usada nas comandas), no tamanho de papel ativo (50/58/80mm).

## Conteúdo do resumo (WhatsApp e cupom)
```text
RESUMO DE ENTREGAS
Loja X — Entregador: Júlio César
Turno: 09/10 18:37 -> 11/10 17:54
--------------------------------
#1018  Centro      Dinheiro  R$ 5,00
#1026  Ipiranga    Pix       R$ 8,50
...
--------------------------------
Entregas: 11 (3 em dinheiro)
DINHEIRO A DEVOLVER AO CAIXA
 Cobrado dos clientes   R$ 150,00
 Troco levado           R$  50,00
 Total a devolver       R$ 200,00
 Situação: devolvido em 11/10 17:40 / pendente
TAXAS DE ENTREGA (loja -> entregador)
 Total                  R$  93,50
 Situação: pagas via Pix em ... / a pagar
```

## Detalhes técnicos
- Novo helper puro `src/lib/driver-summary.ts`: `buildDriverSummaryText(driver, session, store, cols)` para o cupom (usa `row/lineOf/wrapIndent/stripAccents` do receipt-builder) e `buildDriverSummaryWhatsApp(...)` com negrito `*...*`.
- `computeSession` passa a incluir `driver_phone` (busca na tabela `drivers`) em `CashDriverSummary`; sem migração.
- Impressão via `printQzReceipt` + `getEffectivePrinterName`, usando as configurações da impressora principal da loja (mesmo caminho do `printOrderViaQz`); Bluetooth segue o mesmo fallback já usado nas comandas. Erro mostra toast sem bloquear.
- Botões adicionados em `src/routes/admin.caixa.tsx` nos dois lugares; só Pro (como o restante do Caixa).
- Envio pelo link do WhatsApp (sem envio automático pela Evolution API, que ainda não está ativa).
