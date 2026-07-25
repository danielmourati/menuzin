## 1. PIX Manual: refletir chave configurada no checkout

**Bug**: `src/components/storefront/CartDrawer.tsx:1289-1294` renderiza chave e recebedor hardcoded (`pix@burgerprime.com.br` / `Burger Prime LTDA`), ignorando `settings.pix_manual_key`, `settings.pix_manual_key_type` e `settings.pix_manual_receiver` já retornados por `getPublicPaymentSettingsBySlug`.

**Ação**:
- Ler dos `settings` do drawer:
  - Chave: `settings?.pix_manual_key` (fallback: mensagem "Loja não configurou a chave PIX").
  - Recebedor: `settings?.pix_manual_receiver`.
  - Tipo: `settings?.pix_manual_key_type` (rótulo humano: CPF/CNPJ/E-mail/Telefone/Aleatória).
- Botão "Copiar chave" (usar `navigator.clipboard.writeText`) com toast de sucesso.
- Manter o card "Envie o comprovante via WhatsApp" que já existe abaixo (linha ~1501), consolidando UX.

## 2. Botão de voltar/recolher (ChevronDown) no ProductModal

**Bug**: `src/components/storefront/ProductModal.tsx:300` usa classe `[&>button]:hidden` no `DialogContent` para esconder o close default do Radix. Como o novo `<Button>` (linha 321) é filho direto do `DialogContent`, ele também está sendo escondido pelo mesmo seletor.

**Ação**: envolver o botão de voltar em um `<div className="absolute left-3 top-3 z-20">` (o seletor `[&>button]` só afeta botões filhos diretos). Fazer o mesmo com o badge da loja para blindar contra o mesmo problema. Nenhuma outra mudança de estilo/comportamento.

## 3. Consolidar layout desktop/mobile do storefront

**Diagnóstico**: `src/routes/$slug.tsx:335-470` mantém dois blocos distintos (`md:hidden` mobile e `hidden md:block` desktop) com HTML diferente para o mesmo header/busca. Isso duplica manutenção e diverge estilos.

**Ação**:
- Remover o bloco desktop; usar somente o layout mobile (card compacto com logo + status + chips de delivery/tempo/mínimo + busca colapsável) para todos os breakpoints, limitando largura via `container mx-auto max-w-3xl`.
- Aumentar densidade em ≥ md (`md:` tipografia levemente maior, `md:h-14 md:w-14` logo, `md:text-base` nome), mantendo a mesma estrutura JSX.
- Manter grid de produtos responsivo (já é: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`).

## 4. Categorias fixas no topo (anexo 1)

**Ação em `src/routes/$slug.tsx`**:
- Envolver a barra de chips de categorias (linhas 522-545) + o toggle grid/lista (linhas 549-559) num único container `sticky top-0 z-30 -mx-4 border-b bg-background/95 backdrop-blur px-4 py-2`.
- Enquanto a barra fica pinada, o card da loja (header) desce naturalmente para fora da viewport na rolagem — comportamento nativo de `sticky` sem JS.
- Ao pinar (`stuck`), reduzir levemente o padding vertical (Tailwind: usar `IntersectionObserver` opcional NÃO necessário; padding fixo já resolve a demanda visual do anexo).
- Ao clicar em uma categoria, rolar suavemente até a `<section>` correspondente com `scrollIntoView({ behavior: "smooth", block: "start" })`, ajustando o offset pela altura da barra sticky (via `scroll-margin-top` na `<section>`).
- Consolidar o botão de alternar grid/lista dentro da mesma barra sticky à direita, mantendo o padrão único de um toggle já estabelecido.

## Fora de escopo
- Cálculo de categoria "ativa" pelo scroll spy (destaque automático conforme rola). Fica para próxima iteração se pedido.
- Mudanças em `CartDrawer` além do bloco PIX manual.
- Alterações em regras de plano, gateway MP ou modelo de dados.

## Detalhes técnicos
- Nenhuma migração de banco.
- Sem novos pacotes.
- `pix_manual_key_type` já vem tipado em `payments.functions.ts` → mapa local `{cpf:"CPF", cnpj:"CNPJ", email:"E-mail", phone:"Telefone", random:"Aleatória"}`.
- Sticky funciona porque o pai (`.container`) não tem `overflow`. Verificar durante implementação; se necessário, subir o sticky para nível acima do container.
