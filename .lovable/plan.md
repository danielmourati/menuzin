# Impressoras: automações no lugar certo e layout por impressora

Quatro ajustes na área de impressora.

## 1. Conexão automática dentro do card "Status do QZ Tray"

O interruptor "Conectar automaticamente ao QZ Tray ao logar" sai do card "Automações" e passa a ficar no rodapé do card **Status do QZ Tray**, junto do status e dos botões de detectar/testar — é onde o assunto pertence.

## 2. Aceite automático de pedidos vai para a aba "Impressoras"

O interruptor "Aceite automático de pedidos" sai da aba Conexão e aparece na aba **Impressoras**, no painel da impressora do Caixa (é ela que imprime a comanda). Continua exclusivo do plano Pro, com o mesmo texto explicativo.

Com isso o card "Automações" deixa de existir.

## 3. Layout do cupom por impressora

Hoje o layout do cupom (fonte, tamanho, separador, corte, linhas em branco, o que aparece no cupom) é único para a loja. Cada impressora adicional (Cozinha, Bar, Balcão) passa a ter, no seu painel, um bloco "Layout do cupom" com um interruptor:

- **Usar o layout da loja** (padrão) — nada muda, imprime igual hoje.
- **Personalizar** — abre os mesmos campos da aba "Layout do Cupom" só para aquela impressora.

A aba "Layout do Cupom" continua sendo o padrão da loja e o layout da impressora do Caixa.

## 4. Botão "Configurar impressora" abre o modal

Em Configurações > Impressora, o botão **Configurar impressora** deixa de mudar de página e abre um modal com a mesma área de impressoras (lista à esquerda, configuração à direita), com rolagem interna quando o conteúdo não couber na tela, e botões Cancelar / Salvar no rodapé — como no exemplo enviado. Quem preferir a página completa continua chegando nela pelo menu.

## Detalhes técnicos

- `src/routes/admin.configuracoes.impressora.tsx`: mover `Toggle auto_connect` para dentro do `CardContent` do card de status do QZ; remover o card "Automações"; passar `autoAcceptOrders`/`onAutoAcceptChange` (+ `canAutoAccept` do `useTenantPlan()`) para o `mainDetail` do `PrintersManagerGated`.
- Migração: adicionar `layout_overrides jsonb` (nullable) em `public.tenant_printers`. `null` = herda o layout da loja. Sem novos GRANTs/policies além dos existentes da tabela.
- `src/lib/tenant-printers.functions.ts`: incluir `layout_overrides` no `SaveInput` (schema Zod parcial espelhando os campos de layout de `PrinterSettings`), em `rowToPrinter` e no upsert.
- `src/components/printer/PrintersManager.tsx`: novo bloco colapsável "Layout do cupom" no painel da impressora selecionada, com switch herdar/personalizar; extrair os campos de layout hoje inline na rota para um componente reutilizável `src/components/printer/ReceiptLayoutFields.tsx`, usado tanto na aba "Layout do Cupom" quanto no painel por impressora.
- Impressão: onde a comanda é montada (`printQz*` / helpers de cupom), aplicar `layout_overrides` da impressora sobre o `PrinterSettings` da loja antes de renderizar.
- Novo `src/components/printer/PrintersDialog.tsx`: `Dialog` com `max-h-[85vh]`, corpo `overflow-y-auto`, renderizando `PrintersManager`; usado em `src/routes/admin.configuracoes.index.tsx` no lugar do `Link` da aba Impressora.
