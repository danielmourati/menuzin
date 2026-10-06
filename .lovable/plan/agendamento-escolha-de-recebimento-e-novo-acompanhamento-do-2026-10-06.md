# Agendamento, escolha de recebimento e novo acompanhamento do pedido

Visual no estilo Menuzin (cores e fontes da loja), seguindo a organização das imagens enviadas. Vale para todas as lojas.

## 1. Escolha de recebimento no topo da loja
- Novo botão abaixo do cabeçalho da loja: "Calcular taxa e tempo de entrega" (mostra a escolha feita depois, ex.: "Entregar em Rua X · R$ 5 · ≈40-75 min").
- Ao tocar, abre um menu "Como você quer receber" com **Entregar**, **Retirar** e **Consumir no local**. Retirar e Consumir mostram o endereço da loja. Só aparecem os modos que a loja ativou.
- Entregar abre "Calcular taxa e tempo de entrega": selecionar o bairro/região ou digitar o CEP. Mostra a taxa e o tempo.
- A escolha fica salva e já vem marcada no carrinho/checkout, sem pedir de novo.
- "Consumir no local": nova chave liga/desliga em Configurações > Entrega (já existe no sistema, só falta a opção visível).

## 2. Agendamento de pedidos
- Nova configuração da loja (Configurações > Pedidos): "Permitir pedidos agendados", com intervalo entre horários (padrão 10 min) e quantos dias à frente (padrão 7).
- No checkout, nova etapa "Retirar meu pedido" / "Entregar meu pedido": endereço, link "Alterar entrega ou endereço" e duas opções:
  - **Agora** (≈ tempo configurado, ex. 20-70 min), só quando a loja está aberta.
  - **Agendar (selecionar horário)**: abre "Opções de agendamento" com dias (Hoje, TER 6, QUA 7...) e horários em faixas (14h00 - 14h10), respeitando o horário de funcionamento e o tempo mínimo de preparo. Depois de confirmar, mostra "Agendado para Seg. 5 de out. 15h10 - 15h20".
- Com a loja fechada, o cliente ainda pode fazer pedido agendado (se a loja permitir).
- No painel: selo "Agendado 05/10 15h10" no cartão do pedido, nos detalhes, na impressão e na mensagem do WhatsApp. O som/aceite automático continua igual.

## 3. Novo acompanhamento do pedido
- Topo: "Pedido #1234" + "Ver detalhes", modo ("Retirar meu pedido" / "Entregar em") com o endereço.
- Barra de progresso conforme o status e "Previsto para 05/10 às 15h10" (horário agendado ou hora do pedido + tempo médio).
- Cartão em destaque com o status atual e uma frase amigável (ex.: "Confirmado — seu pedido foi confirmado e está sendo preparado").
- "Linha do tempo" com horário de cada etapa (Efetuado, Confirmado, Em preparo, Saiu para entrega/Pronto, Finalizado).
- "Precisa de ajuda? Fale conosco": **Chat** (abre o WhatsApp da loja com o número do pedido) e **Ligar para (xx) xxxx**.
- Botão **Voltar** para o cardápio.
- "Ver detalhes": tela com origem ("Pedido feito pelo site"), "Agendado para", endereço, itens com adicionais, subtotal, entrega, total e forma de pagamento.

## Detalhes técnicos
- Banco (migração): `orders.scheduled_for timestamptz null`; `tenants.scheduling_enabled boolean default false`, `scheduling_slot_minutes int default 10`, `scheduling_days_ahead int default 7`. `accepts_dinein` já existe.
- Geração de horários em utilitário compartilhado (`src/lib/scheduling.ts`) usando `hours_schedule`, `takeout/delivery_time_min`; validação repetida no servidor em `orders.functions.ts` (rejeita horário fora do funcionamento/no passado).
- Estado do modo + endereço em contexto do storefront (persistido em localStorage via `useEffect`), consumido pelo `CartDrawer`.
- Linha do tempo a partir de `order_status_history` (leitura pública já usada pelo acompanhamento, via server fn com ID do pedido).
- Atualizar `CustomerOrderTracking.tsx`, `OrderCard`, `OrderDetailsDrawer`, `kitchen-ticket`/`receipt-builder` e `whatsapp.ts` para exibir o agendamento.
- Conferir no navegador (mobile): escolher Retirar, agendar, finalizar e ver acompanhamento e painel.
