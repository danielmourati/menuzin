## 1. Corrigir criação de novo tenant

**Problema:** mesmo quando o checkbox "Clonar Burger Prime" está desmarcado, o servidor faz fallback para `burgerprime` em `src/lib/platform.functions.ts`:

```ts
const sourceSlug = data.clone_from_slug ?? "burgerprime";
```

E na UI (`src/routes/platform.tenants.novo.tsx`) o estado inicial é `cloneBurger = true`.

**Mudanças:**
- `src/lib/platform.functions.ts` (`adminCreateTenant`): remover o fallback. Só clonar quando `data.clone_from_slug` for explicitamente uma string não vazia. Caso contrário, pular `cloneCatalog` e ir direto para o seed por `business_types` (se houver).
- `src/routes/platform.tenants.novo.tsx`: mudar default `useState(true)` → `useState(false)` para `cloneBurger`, e ajustar copy do checkbox se necessário (deixar claro que é opcional).

Resultado: nova loja nasce limpa por padrão; clone só acontece se o admin marcar a opção.

## 2. Zerar dados da loja `/vila-boemia`

Tenant `6069c189-5657-4f65-958c-36b5109f7420` (Churrascaria Vila Boêmia) hoje tem 16 produtos, 10 categorias, 0 pedidos.

Executar via migration (DELETE em ordem segura para respeitar dependências), preservando: linha em `tenants`, `user_roles`, `profiles` e configurações de pagamento/impressora não serão zeradas — apenas catálogo e pedidos:

```text
DELETE order_items / order_status_history / payments  (where order in tenant)
DELETE orders                                          (where tenant_id = ...)
DELETE product_addons / product_sizes / product_flavors (where product in tenant)
DELETE products                                        (where tenant_id = ...)
DELETE addon_options / addon_group_targets             (where group in tenant)
DELETE addon_groups                                    (where tenant_id = ...)
DELETE category_pizza_sizes / _doughs / _crusts        (where category in tenant)
DELETE categories                                      (where tenant_id = ...)
DELETE coupons                                         (where tenant_id = ...)
DELETE cep_ranges / delivery_zones                     (where tenant_id = ...)
```

Mantidos intactos: `tenants`, `user_roles`, `profiles`, `store_payment_settings`, `printer_settings`, `tenant_printers` (login do admin segue funcionando).

## Confirmação

Posso prosseguir? Em particular, sobre o item 2: você quer **manter** as configurações de pagamento/impressora da Vila Boêmia, ou também zerar essas tabelas?
