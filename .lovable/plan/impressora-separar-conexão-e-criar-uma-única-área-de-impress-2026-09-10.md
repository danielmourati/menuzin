# Impressora: separar Conexão e criar uma única área de impressoras

Hoje a tela de Impressora tem três abas e a configuração de impressoras está espalhada: a aba "Conexão & Impressora" mistura o status do QZ Tray com a impressora principal, e a aba "Outras Impressoras" tem um segundo cadastro (cozinha, bar, balcão) com campos parecidos. A ideia é separar conexão de impressoras e concentrar todo o cadastro em um só lugar, no estilo do sistema do anexo 3: lista de impressoras à esquerda, configuração da selecionada à direita.

## Como vai ficar

Três abas:

1. **Conexão** — só o que é ligação com o computador: status do QZ Tray, botões Detectar / Teste de conexão, ajuda e solução de problemas, download do certificado e instalador, e os dois interruptores automáticos (conectar ao logar e aceite automático de pedidos).
2. **Impressoras** — área única de cadastro, com a lista de impressoras à esquerda e a configuração da escolhida à direita.
3. **Layout do Cupom** — sem mudanças.

Na aba Impressoras:

```text
+------------------------+---------------------------------------+
| Impressoras            |  Impressora do Caixa (recibo)         |
|  > Caixa (recibo)      |  Impressora: [ lista detectada  v ]   |
|    Cozinha principal   |  Largura do papel / Fonte / Tamanho   |
|    Bar                 |  Ativa [x]   Padrão da loja [ ]       |
|  [ + Adicionar ]       |  [Testar impressão]     [Excluir]     |
+------------------------+---------------------------------------+
```

- A primeira linha da lista é sempre a impressora principal da loja (o recibo do caixa) — a mesma que já existe hoje na aba Geral, agora só com nome, modelo, tipo de conexão e perfil ESC/POS.
- As demais linhas são as impressoras adicionais já cadastradas (cozinha, bar, balcão), com o mesmo formulário à direita.
- O bloco "Impressora deste Computador / Dispositivo (Local)" continua existindo, dentro do painel da impressora principal, já que é uma escolha por máquina.
- Cada impressora tem "Testar impressão"; as adicionais também têm excluir. Salvar continua pelo botão do topo da página.
- No celular a lista vira uma faixa rolável acima do formulário.

Nada é removido do banco e nenhuma configuração existente se perde: é reorganização de tela.

## Detalhes técnicos

- `src/routes/admin.configuracoes.impressora.tsx`: `TabsList` passa a ser `conexao | impressoras | layout`. O card "Status do QZ Tray" (incl. certificado, diagnóstico, guia) e os dois `Toggle` (`auto_connect`, `auto_accept_orders`) vão para a aba `conexao`. O card "Impressora" deixa de existir como bloco solto — seus campos (`printer_name`, `printer_model`, `connection_type`, `escpos_profile`, aviso Bluetooth/USB, bloco de impressora do dispositivo) viram o painel de detalhe do item "Caixa" dentro da nova aba.
- Novo componente `src/components/printer/PrintersManager.tsx` (substitui o uso de `ExtraPrintersManager` na página), com layout master-detail:
  - Props: os campos/`set` do `PrinterSettings` da loja + o bloco de dispositivo local, renderizados quando o item selecionado é `main`.
  - Itens extras vindos de `listMyTenantPrinters()`, salvos por `saveTenantPrinter` e removidos por `deleteTenantPrinter` (mesmas funções de hoje, sem mudança de servidor nem de schema).
  - Estado local `selectedId: "main" | <uuid> | draft`, com rascunho novo criado por "+ Adicionar" (reaproveitar `makeDraft()`), detecção de impressoras via `listQzPrintersWithDefault()` e teste via `printQzTextTest`.
- `ExtraPrintersManager.tsx` é aposentado (a lógica de drafts/salvar/testar é movida para `PrintersManager`); `ExtraPrintersManagerGated` vira `PrintersManagerGated`, mantendo o gate `useTenantPlan()` / `UpgradeNotice`.
- Sem migração de banco: `printer_settings` continua guardando a impressora principal e `tenant_printers` as adicionais.
