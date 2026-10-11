# Cardápio de demonstração para a Pizzaria Dominus

A loja existe e hoje tem só 1 categoria, sem produtos. Os dados entram apenas para a Pizzaria Dominus.

## O que será criado
1. **Categoria "Pizzas Tradicionais"** (tipo pizza) com tamanhos:
   - Broto (4 pedaços, 1 sabor), Média (6, até 2 sabores), Grande (8, até 3), Família (12, até 4)
   - Massas: Tradicional, Fina (+R$ 0), Integral (+R$ 4)
   - Bordas: Sem borda, Catupiry (+R$ 8), Cheddar (+R$ 8), Chocolate (+R$ 10)
   - Sabores (~10): Mussarela, Calabresa, Portuguesa, Frango c/ Catupiry, Marguerita, Quatro Queijos, Pepperoni, Bacon, Napolitana, Toscana — com preço por tamanho (ex.: Broto R$ 29 / Média R$ 45 / Grande R$ 59 / Família R$ 75)
2. **Categoria "Pizzas Especiais"** (pizza, mesmos tamanhos, preços maiores): Camarão, Filé c/ Cheddar, Lombo Canadense, Strogonoff
3. **Categoria "Pizzas Doces"**: Chocolate, Romeu e Julieta, Banana c/ Canela, Prestígio
4. **Promoções**:
   - 3 pizzas com preço promocional (riscado) e marcadas em destaque
   - 1 **Oferta do Dia**: "Grande + Refri 2L" com preço fixo (tamanho Grande, até 2 sabores)
5. **Bebidas** (sem tamanho): Coca-Cola 2L, Guaraná 2L, Lata 350ml, Água, Suco
6. Imagens genéricas de pizza/bebida em todos os itens; todos disponíveis.

A categoria já existente será mantida (ou reaproveitada se for de pizza).

## Detalhes técnicos
- Inserções via ferramenta de dados (não migração), escopadas em `tenant_id = 6db6c932-…`.
- Tabelas: `categories`, `category_pizza_sizes/doughs/crusts`, `products` (type pizza, `promo_price`, `featured`), `product_sizes` com `category_size_id` por tamanho; oferta usa colunas `offer_*`.
- Conferir no cardápio da loja ao final.
