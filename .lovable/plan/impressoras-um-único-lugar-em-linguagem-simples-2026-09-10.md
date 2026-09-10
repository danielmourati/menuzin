# Impressoras: um único lugar, em linguagem simples

Hoje a configuração de impressora está espalhada em três lugares que fazem quase a mesma coisa: a página com abas (Conexão / Impressoras / Layout do Cupom), um modal "Impressoras" simplificado e outro modal de configuração completo. Isso gera campos repetidos e muito termo técnico.

A partir de agora existe **um único modal de Impressoras**, e é ele que abre em qualquer botão de impressora do sistema.

## Como fica o modal

```text
+------------------------+-----------------------------------------+
| ONDE IMPRIMIR          |  Caixa (recibo do cliente)              |
|  > Caixa (recibo)      |  Impressora: [ escolher da lista   v ]  |
|    Cozinha             |  Tamanho do papel: [ 80mm          v ]  |
|    Bar                 |  [x] Ativa                              |
|                        |  [x] Imprimir pedidos automaticamente   |
|  [ + Adicionar local ] |  > Opções avançadas                     |
|                        |  [ Imprimir teste ]        [ Excluir ]  |
+------------------------+-----------------------------------------+
| Impressão ligada ✓ · Ajuda        [ Cancelar ]     [ Salvar ]     |
+-------------------------------------------------------------------+
```

- **Lista à esquerda**: o Caixa sempre em primeiro, depois os locais adicionais (Cozinha, Bar, Balcão). Cada linha mostra o nome do local e a impressora escolhida.
- **À direita**: só o essencial — qual impressora usar, tamanho do papel, se está ativa e, no Caixa, a chave de imprimir pedidos automaticamente (Plano Pro).
- **Opções avançadas** (recolhido): fonte, tamanho da letra, negrito nos títulos, separador, tipo de corte, linhas em branco no final e o que aparece no cupom (nome da loja, endereço, WhatsApp, Pix, Instagram, mensagem de agradecimento). Cada local adicional pode escolher entre "seguir o padrão da loja" ou personalizar aqui.
- **Rodapé**: estado da impressão ("Impressão ligada" / "Programa de impressão não encontrado"), com botões Testar conexão, Como instalar e Diagnóstico agrupados atrás de "Ajuda". Cancelar e Salvar salvam tudo de uma vez.
- O modal rola por dentro e cabe em telas pequenas (no celular a lista vira uma faixa deslizante em cima).

## Linguagem

Trocas em todas as telas de impressora:

| Antes | Depois |
| --- | --- |
| QZ Tray / Status do QZ Tray | Programa de impressão / Impressão no computador |
| Conexão & Impressora, Perfil ESC/POS, Tipo de conexão | somem da tela principal (ficam em Opções avançadas ou são definidos sozinhos) |
| Impressora do sistema | Escolha a impressora |
| Largura do papel 55mm/80mm | Tamanho do papel — 80mm (bobina comum) / 58mm (bobina pequena) |
| Função: receipt/kitchen/bar | Onde fica: Caixa, Cozinha, Bar, Balcão |
| Layout do cupom / tipografia | Aparência do cupom |
| Aceite automático de pedidos | Imprimir e aceitar pedidos automaticamente |
| Testar /qz-cert.crt, endpoint, PEM | somem da tela (ficam só no relatório de diagnóstico) |

## Onde o modal abre

- Configurações > Impressora — o item abre o modal em vez de mudar de página.
- Botão "Configurar impressora" em Configurações.
- Aviso "Sem Impressora" no topo do painel e o passo de impressora do checklist inicial.
- O endereço `/admin/configuracoes/impressora` continua funcionando: entra em Configurações já com o modal aberto (ninguém fica com link quebrado).

Nenhuma configuração salva se perde: é só reorganização de tela.

## Detalhes técnicos

- `PrinterConfigModal.tsx` passa a ser o único modal. Ele absorve o que hoje só existe em `PrintersManager.tsx` (rascunhos de impressoras extras, exclusão, `layout_overrides` por impressora via `ReceiptLayoutFields`) e o card de status/ajuda do QZ da rota (detectar, teste de conexão, `QzInstallGuide`, `QzDiagnosticsModal`), agora condensados no rodapé.
- Excluir `PrintersDialog.tsx`, `PrinterSettingsDialog.tsx` e `PrintersManager.tsx`; atualizar todos os importadores (`admin.configuracoes.index.tsx`, `PrinterStatusIndicator.tsx`, `OnboardingChecklist.tsx`, `QzPrinterWizard` se ainda referenciado).
- `src/routes/admin.configuracoes.impressora.tsx` (1157 linhas) é reduzido a um redirect/atalho: renderiza `admin.configuracoes` com `PrinterConfigModal` aberto. Todo o estado de formulário do QZ e do layout sai da rota.
- Estado do modal: `caixaForm: PrinterSettings` (via `getMyPrinterSettings`/`saveMyPrinterSettings`, incluindo `auto_connect` e `auto_accept_orders`) + `extraDrafts` (via `listMyTenantPrinters`/`saveTenantPrinter`/`deleteTenantPrinter`, com `layout_overrides`). Salvar único no rodapé grava os dois.
- Gates de plano preservados: `useTenantPlan().can("multiplePrinters")` para locais adicionais e `can("kitchenPrinter")` para o aceite automático, com `UpgradeNotice` no painel correspondente.
- `use_default_typography` deixa de ser uma chave visível: ligado por padrão; abrir "Opções avançadas" e alterar fonte/tamanho o desliga automaticamente.
- Sem migração de banco; `printer_settings` e `tenant_printers` seguem iguais.
