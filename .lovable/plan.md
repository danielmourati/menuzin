# Habilitar métodos online no checkout público

## Diagnóstico

Na aba admin, o tenant `burgerprime` já está corretamente configurado:
- Mercado Pago conectado (credenciais manuais salvas e criptografadas)
- Pix Online ativado

Porém, ao tentar pagar no checkout da loja pública, aparece "Nenhum método online ativado". Isso **não tem relação com sandbox vs produção** das credenciais do Mercado Pago — o problema está antes disso.

`src/components/storefront/CartDrawer.tsx` chama `getPaymentSettingsBySlug(slug)` para carregar as configurações da loja. Hoje essa função em `src/lib/payment-service.ts` é um stub:

```ts
export async function getPaymentSettingsBySlug(_slug: string) {
  return null; // ← sempre null
}
```

Com `settings = null`, o `PaymentMethodSelector` usa o fallback padrão (`mp_connected: false`, `pix_enabled: false`, etc.) e por isso esconde todos os métodos online.

## O que será feito

### 1. Server function pública por slug
Criar `getPublicPaymentSettingsBySlug` em `src/lib/payments.functions.ts` (sem `requireSupabaseAuth`, usando `supabaseAdmin`), que:
- Recebe `{ slug }`
- Resolve `tenant_id` em `tenants` pelo `slug` (apenas tenants ativos)
- Lê `store_payment_settings` daquele tenant
- Retorna **somente os campos seguros** já tipados como `StorePaymentSettingsSafe` (flags `mp_connected`, `cash_enabled`, `pix_manual_enabled`, `card_on_delivery_enabled`, `pix_enabled`, `credit_card_enabled`, `debit_card_enabled`, e dados do Pix manual). Nunca expor `mp_access_token_encrypted` nem chaves cruas.
- Valida input com Zod (`slug` regex curto).

### 2. Plugar no client wrapper
Atualizar `getPaymentSettingsBySlug` em `src/lib/payment-service.ts` para chamar a nova server fn em vez de retornar `null`.

### 3. Verificação
Abrir a loja `/burgerprime`, ir ao checkout, escolher "Pagar agora" e confirmar que o Pix Online aparece. Cartão crédito/débito permanecem ocultos enquanto estiverem desligados no admin — comportamento esperado.

## Sobre sandbox vs produção

Trocar as credenciais para produção **não** resolveria esse erro, porque o checkout sequer chega a falar com o Mercado Pago — ele para antes, na leitura das configurações da loja. A decisão sandbox vs produção é independente e só afeta a geração real de cobranças Pix/cartão quando o checkout transparente for executado.
