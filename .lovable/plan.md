# Corrigir Pix online que abre tela em branco

## O que encontrei (conferido no banco)
As 6 últimas tentativas de Pix do Pastelão Junin (hoje, 01:09–01:20 UTC) foram **recusadas pelo antifraude do Mercado Pago** (`rejected_high_risk`). A conexão está ok — o MP responde, mas recusa o pagamento e não gera QR Code.

Três problemas no nosso lado:
1. **E-mail falso do pagador:** quando o cliente não informa e-mail, enviamos `comprador@teste.com`. O antifraude do MP marca isso como alto risco. Também não enviamos CPF nem telefone, que ajudam a aprovar.
2. **Tela em branco:** quando o MP recusa, o servidor devolve um Pix "vazio" e o carrinho abre "Pagamento Pix" sem QR Code, sem nenhuma mensagem.
3. **Recusa repetida:** a chave de idempotência é fixa por pedido (`order_<id>_pix_online`), então novas tentativas no mesmo pedido recebem de volta o mesmo pagamento recusado (vários registros com o mesmo ID 185928476827).

## Correções
1. **Dados do pagador**
   - Remover o `comprador@teste.com`. Se o cliente não tiver e-mail, usar um e-mail técnico válido e único por pedido no domínio da plataforma (ex.: `pedido-<numero>@menuzin.app`) e enviar telefone do cliente (`payer.phone`) e nome real.
   - Opcional no checkout: campo CPF ao escolher Pix Online (enviado como `identification`), recomendado pelo MP para reduzir recusas. 
2. **Tratar recusa no servidor** (`createPixPayment`): se o status vier `rejected`/`cancelled` ou sem `qr_code`, registrar e lançar erro claro em português, ex.: "O Mercado Pago recusou este Pix por segurança. Tente outra forma de pagamento." Mapear `rejected_high_risk` e outros `status_detail` comuns.
3. **Tela do carrinho:** só abrir "Pagamento Pix" quando houver QR Code; caso contrário mostrar o aviso e manter o cliente na escolha de pagamento (sugerindo Pix manual/dinheiro/maquininha).
4. **Nova tentativa:** a chave de idempotência passa a usar o ID da linha de pagamento (única por tentativa), permitindo gerar um novo Pix após uma recusa.
5. **Teste:** pequeno teste para a regra "resposta recusada ou sem QR → erro, não tela vazia".

## Observação
Mesmo com essas correções, a decisão final do antifraude é do Mercado Pago. Se as recusas continuarem com dados reais do cliente, o lojista precisa verificar a conta MP (chave Pix cadastrada, conta validada) junto ao Mercado Pago.

## Técnico
- `src/components/storefront/CartDrawer.tsx` linhas ~864 e ~915 (fallback de e-mail; `setPixData` só com `qr_code`).
- `src/lib/payments.functions.ts`: schema do payer aceita `phone`; após resposta MP, checar `status`/`qr_code`; `X-Idempotency-Key: payment_${paymentRowId}`.
