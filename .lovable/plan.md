## Ajustes no modal de detalhes do pedido (status "Em preparo")

Escopo: apenas UI no `OrderDetailsDrawer` e componentes auxiliares de botão. Sem mudanças de regra de negócio.

### 1) Header — "Copiar Resumo" sobrepondo o X
`src/components/orders/OrderDetailsDrawer.tsx`
- Mover o botão "Copiar Resumo" do `DialogHeader` para o início da `DialogDescription` (linha dos badges), deixando o título sozinho na linha de cima. Assim o X (canto superior direito do `DialogContent`) fica livre.
- Manter o mesmo estilo compacto (`size="sm"`, `h-8`).

### 2) Footer — substituir "Notificar Preparo" pela reimpressão da cozinha (apenas quando status = `preparo`)
`src/components/orders/WhatsAppOrderActions.tsx`
- Adicionar prop opcional `hideStatusButton?: boolean`. Quando `true`, não renderiza o botão de notificação de status — somente "Conversar (WhatsApp)".
- Aplicar verde no botão "Conversar (WhatsApp)": `bg-success/10 hover:bg-success/15 text-success border-success/40` com ícone em `text-success`.

`src/components/orders/OrderDetailsDrawer.tsx`
- Calcular `const isPreparo = order.status === "preparo"`.
- Passar `hideStatusButton={isPreparo}` para `<WhatsAppOrderActions />`.
- Quando `isPreparo`, renderizar ao lado de "Conversar" um `<PrintKitchenButton>` com rótulo "Reimprimir Cozinha" (suportar label customizado via prop ou via children). Remover o `PrintKitchenButton` da linha de baixo somente nesse caso (para não duplicar).

`src/components/orders/PrintKitchenButton.tsx` (leitura prévia + ajuste mínimo)
- Aceitar prop opcional `label?: string` para customizar o texto ("Reimprimir Cozinha").

### 3) Footer — inverter Cancelar/Fechar e recolorir
`src/components/orders/OrderDetailsDrawer.tsx`
- Reordenar o footer para que a linha de ações de status (`OrderStatusActions`, que contém "Cancelar") fique acima da linha que contém "Fechar"; ou seja, "Cancelar" passa a aparecer antes de "Fechar" visualmente (inversão de posição pedida).
- "Imprimir pedido completo": trocar `bg-sky-600 hover:bg-sky-700 border-sky-600` por laranja: `bg-orange-600 hover:bg-orange-700 border-orange-600 text-white`.
- "Fechar": trocar o estilo neutro por vermelho destrutivo: `bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive`.

### Layout final do footer no estado "Em preparo"
```text
[ Reimprimir Cozinha (âmbar) ] [ Conversar WhatsApp (verde) ]
[ Imprimir pedido completo (laranja) ] [ Fechar (vermelho) ]
[ Saiu para Entrega ] [ Cancelar ]
```
Nos demais status, o footer mantém o comportamento atual (com "Notificar …" no lugar da reimpressão), apenas com as recolorações de Imprimir/Fechar/Conversar e a inversão Cancelar/Fechar aplicadas globalmente.

### Fora de escopo
- Lógica de impressão, templates WhatsApp, transições de status, layout do corpo do modal.