# Checkout/Order Flow Improvements

Escopo todo em `src/components/storefront/CartDrawer.tsx`. O fluxo pós-pedido já tem a página de confirmação certa (`/$slug/pedido-confirmado`) que mostra **WhatsApp** + **Acompanhar pedido** — não precisamos trocar a rota, só corrigir o bug que está fazendo a página dizer "Pedido não encontrado".

## 1. Bug "Pedido não encontrado" após finalizar (imagem 3)

Causa raiz em `finalize()`:

```ts
let orderNumber = dbOrderNumber;
if (!orderId) {
  orderId = await ensureOrder(paymentMethod);
  orderNumber = dbOrderNumber; // ❌ lê estado React antigo, ainda null
}
// ...
number: orderNumber ?? 1000 + Math.floor(Math.random() * 9000) // ❌ fallback inválido
navigate({ search: { n: order.number } }) // navega com número aleatório que não existe
```

Quando o método é offline (dinheiro / cartão na entrega / pix manual), `ensureOrder` é chamado dentro do próprio `finalize`, e `dbOrderNumber` ainda é `null` na próxima linha porque `setState` é assíncrono. Aí cai no fallback aleatório `1000 + random` e a página `pedido-confirmado` busca um número que não existe no banco.

Correção:
- Fazer `ensureOrder` **retornar `{ id, number }`** e usar esses valores locais em `finalize` em vez de reler `dbOrderNumber`.
- Remover o fallback aleatório — se persistência falhar, abortar com toast de erro e não navegar.
- Se a navegação não acontecer, o usuário fica na revisão e pode tentar de novo.

## 2. Submit hardening

- Novo state `submitting`. `finalize()` retorna cedo se já estiver `submitting`.
- CTA "Fazer pedido" mostra `Loader2` e fica disabled enquanto `submitting`.
- `try/finally` resetando o flag.
- `toast.success("Pedido #N criado")` antes do `navigate`.

Isso resolve duplo-clique e cria estado de loading explícito.

## 3. Busca de CEP dinâmica (imagens 1 e 2)

Hoje a busca só roda no `onBlur` do campo CEP. Trocar para busca enquanto digita:

- `useEffect` observando `cep`; quando bater 8 dígitos, dispara `lookupByCep` de `src/lib/viacep.ts` (já existe).
- Debounce de 400 ms via `setTimeout` + cleanup.
- `AbortController` para descartar respostas obsoletas se o usuário continuar digitando.
- Feedback inline abaixo do campo CEP:
  - `Loader2` + "Buscando endereço…" durante a busca.
  - Texto destructive "CEP não encontrado" quando ViaCEP retorna `erro`.
  - Sucesso silencioso (campos preenchem sozinhos).
- Auto-preenche `street` e `neighborhood` **apenas se estiverem vazios** (não sobrescreve edição manual).
- `inputMode="numeric"` mantido; aceita com ou sem máscara (já normalizamos com `replace(/\D/g, "")`).
- A query `resolveDeliveryFee` continua reagindo a `cepDigitsOnly` automaticamente — taxa por bairro segue funcionando.

## 4. "Limpar formulário"

- Botão "Limpar campos" no header dos passos `mode-address`, `mode-table`, `customer` e `review`. Não no passo do carrinho (que já tem "Limpar" do próprio carrinho).
- Se houver dados preenchidos (endereço/mesa/cliente/observação/cupom), abre `AlertDialog` pedindo confirmação ("Limpar todos os campos preenchidos?"). Senão, limpa em silêncio.
- Limpa: `cep, street, number, neighborhood, complement, reference, table, name, phone, email, doc, generalNote, couponInput, appliedCoupon, paymentWhen, selectedMethod, paymentMethod, dbOrderId, dbOrderNumber, pixData, cardData`.
- **Não** mexe nos itens do carrinho.
- Após limpar, volta para o passo `mode`.

## Arquivos

- Editar: `src/components/storefront/CartDrawer.tsx`
- Reutiliza: `src/lib/viacep.ts` (já existente), `src/components/ui/alert-dialog`

## Fora de escopo

- Mudanças de schema, RLS ou rota da confirmação.
- Refatoração de cart-context, payments, admin.
- Identidade visual — botões reutilizam variantes existentes.
