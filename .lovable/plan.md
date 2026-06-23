## Problema

No `OrderDetailsDrawer` (modal usado para todos os status do fluxo de pedidos: novo, aceito, preparo, saiu_entrega, pronto_retirada, servido, finalizado), o card **"Linha do tempo"** está praticamente escondido:

- Está como último bloco do grid (`md:col-span-2`), depois de **Itens**, **Observações**, **Valores** e **Cliente** — o usuário precisa rolar bastante para encontrá-lo.
- Em telas baixas (ex.: 1034×503 atual) o `ScrollArea` mostra apenas a parte de cima e o usuário não percebe que existe timeline abaixo.
- A `HorizontalTimeline` usa `flex-1 min-w-0` por etapa: quando há 5–6 etapas em telas estreitas, os ícones (44×44) e os labels se espremem/clipam, parecendo "vazio" ou cortado.

## Solução

Reorganizar a hierarquia do modal para dar destaque à linha do tempo e garantir que ela sempre apareça e tenha scroll horizontal próprio quando o espaço for insuficiente.

### 1. `OrderDetailsDrawer.tsx` — reordenar o grid

Mover a "Linha do tempo" para o **topo do conteúdo** (acima da grid Itens/Cliente), em largura total. Assim ela é a primeira coisa visível ao abrir o modal, sem depender de scroll.

Nova ordem dentro do `ScrollArea`:

```text
[ Linha do tempo — full width, destacada ]
[ Itens do pedido      |  Cliente ]
[ Observações          |  (continua Cliente) ]
[ Valores e pagamento  |  ]
```

### 2. `OrderStatusTimeline.tsx` — scroll horizontal seguro

Na `HorizontalTimeline`:

- Trocar `flex items-start justify-between gap-1 w-full` por um wrapper com `overflow-x-auto` + `pb-1` e um inner `flex` com **`min-w-max`**, para que em telas estreitas (≤ ~640px) os steps mantenham tamanho legível e o usuário role horizontalmente.
- Definir largura mínima por step (`min-w-[88px] sm:min-w-0 sm:flex-1`), preservando o layout distribuído em telas médias/grandes.
- Manter o conector (`h-1`) com largura mínima visível também quando em modo scroll (`min-w-[24px]`).

Resultado: em desktop continua distribuído full width; em mobile vira uma faixa rolável horizontalmente, sem clipar ícones nem labels.

### 3. `OrderDetailsDrawer.tsx` — robustez do scroll vertical

- Manter `DialogContent` com `flex flex-col h-[92dvh] md:h-auto md:max-h-[92dvh]` (já está) e `ScrollArea` com `flex-1 min-h-0` (já está).
- Adicionar `min-h-0` explícito no wrapper interno do grid para evitar que o `ScrollArea` colapse em telas muito baixas (~500px de altura), garantindo que a barra de rolagem apareça e o footer continue visível e sticky.
- Reduzir o padding do card da timeline em mobile (`p-3 sm:p-4`) para ganhar altura útil.

## Fora de escopo

- `CustomerOrderTracking` (página pública do cliente, não é modal).
- Conteúdo dos cards Itens/Cliente/Valores.
- `CancelOrderModal` (não exibe timeline).
- Lógica de status, dados ou backend.
