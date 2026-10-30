# Item customization window – compact Degust-style layout (PDV)

## What changes
In the PDV (and when editing an order in the admin), the "personalizar item" window becomes simple and compact, like the Degust screenshot:

- Colored title bar "Personalizar item" with an X to close.
- Top row: quantity − 1 + , product name (with size), price on the right in a highlight color.
- No product photo, no store logo, no rating or prep time.
- Body that scrolls: each group (Sabores, Tamanho, Massa/Borda, Adicionais, Observações) is a box with a title that can be collapsed.
  - Choose-one/choose-several options: compact rows with a circle or checkbox.
  - Paid extras: one line each with "Name R$ 1,00" and − 0 + on the right.
  - Required groups keep their "Obrigatório" badge and their checks.
- Fixed footer with two large buttons: "‹ VOLTAR" (light) and "✓ OK" (green). OK stays disabled until required choices are made.
- Wider window on desktop (about 800px) and full screen on mobile.
- Keyboard: Enter confirms (OK), Esc goes back.

The customer storefront keeps its current window with the photo. Nothing changes there.

## Technical details
- Add a `variant?: "storefront" | "compact"` prop to `ProductModal.tsx`. The compact branch renders a new header/footer and skips the image, parallax, lightbox and tenantInfo blocks. It reuses the same selection state, validation and `onAdd` payload, so pricing, flavors and kitchen print stay the same.
- Pass `variant="compact"` from `admin.pdv.tsx` and `EditOrderDialog.tsx`.
- Use colors from the existing design system (primary/destructive/success); no hardcoded colors.
