# PDV: tamanho já escolhido + migrar Observações para Adicionais

## 1. PDV — tamanho pré-selecionado
When the product line picked in "Localizar Produto" already names a size (e.g. "Pastel Atalaia (Pequeno)"):
- The "Tamanho" card does not show in the Personalizar item window.
- The top row shows the name with the size: "Pastel Atalaia (Pequeno)", and the price for that size.
- When the product is opened without a size (only one product row for all sizes), the Tamanho card shows as it does today.
- Only the PDV and the admin edit-order window change. The customer's store stays the same.

## 2. Cardápio — Observações para Adicionais
What's in the database today:
- **Pastelão Sousa:** has no Observações group. Its free options are already in "Adicionais (grátis)". Nothing to migrate.
- **Pastelão Junin:** one "Observações" group with 14 options (1 paid: Azeitona +R$ 1,00), linked to 28 categories/products.

Migration for Pastelão Junin:
- Create **"Adicionais (grátis)"** (add-on, optional) with the 13 free options at R$ 0,00. It is linked to the same 28 categories/products as the old group.
- Move **Azeitona (R$ 1,00)** to the paid group. If the existing "Adicionais" group (already has paid items, currently not linked to anything) already has Azeitona, it is not duplicated. Link that group to the same 28 targets so the paid items appear.
- The "Todos os adicionais" option becomes a free add-on as it is (please confirm if it should be removed).
- Turn off the old "Observações" group without deleting it. Past orders keep their history.
- The order screen and comanda list them as add-ons. Free items show without a price.

## Technical details
- `ProductModal.tsx` (compact): when `initialSizeId` matches, hide the size group and add ` (Size)` to the header title.
- Migration done with data SQL on `addon_groups`/`addon_options`/`addon_group_targets` filtered by the Junin tenant_id. `kind='observacao'` → new `kind='adicional'` groups; old group `active=false`.
- Check afterward with a query and a storefront/PDV look at a Junin pastel.
