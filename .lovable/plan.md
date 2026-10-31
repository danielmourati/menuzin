# Pix Online: refused payments, CPF window and orders going to preparation

## What the data shows
- Order #1029 (Pastelão Junin) now reaches Mercado Pago. Both attempts were refused as **high risk** (`rejected_high_risk`), so no QR code was shown. Last turn's fix works; the refusal itself comes from Mercado Pago.
- The CPF window no longer appears because the CPF typed earlier is remembered, so the system skips asking. This is expected behavior, but it looks like a failure.
- #1029 and #1232 still moved to "Em preparo" without a confirmed payment. #1232 never even created a Pix attempt. So the live site is not blocking unpaid Pix orders.

## What will change
1. **CPF always confirmed for Pix.** When the customer picks Pix Online, a short window always appears with the saved CPF already filled in. The customer clicks "Gerar Pix", so they always see the step happen.
2. **Clear outcome when Mercado Pago refuses.** Instead of a silent stop, the customer sees "Pix recusado pelo Mercado Pago" with buttons for "Tentar novamente" and "Escolher outra forma de pagamento". The order stays in "Novo" with "Pix recusado" on its card.
3. **Unpaid Pix orders never go to preparation.** The rule is checked again on every path that changes order status: automatic acceptance, the accept button, dragging cards on the board, and the order screen. A Pix Online order without approval stays in "Novo".
4. **Mercado Pago account check.** A diagnostic button under Admin → Pagamentos shows whether the connected account is verified, has a Pix key, is in production mode and has any restrictions. The store then knows if the refusals come from the account.
5. **Less "high risk" data on our side.** The payer gets a real e-mail when the customer gave one, and the CPF is sent in Mercado Pago's expected format. A fake shared e-mail domain is used only as a last resort. The order items and phone number are also sent.

## Technical details
- `CartDrawer.tsx`: always open the CPF dialog for `pix_online`, prefilled with `doc`. Handle `rejected` with a retry/change-method panel instead of the toast-only path.
- `useAcceptOrderWithKitchenPrint.ts` / `OrderCard` / board drop: call `canAdvanceOrder` before `updateOrderStatus`. The server gate in `orders.functions.ts` stays the source of truth.
- New server function: call MP `GET /users/me` and `GET /v1/payment_methods` with the tenant token, then return verification and Pix availability. Show the result in Admin → Pagamentos.
- `payments.functions.ts`: log the outgoing payer (CPF masked) for diagnosis. Ensure `identification.number` contains digits only.
- Publish afterwards: the gate only works on the live site after publishing.

## Limitation
If Mercado Pago keeps refusing after these changes, the decision is on Mercado Pago's side. The store owner would need to contact Mercado Pago with the diagnostic result.
