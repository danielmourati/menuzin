# Importar cardápio da Pastelaria Los Hermanos

Destino: somente a loja **Pastelaria Los Hermanos** (hoje sem categorias nem produtos). Nenhuma outra loja será tocada.

## O que será criado
**13 categorias**, na ordem do arquivo: Pastel Carne Moída, Pastel Frango, Pastel Carne de Sol, Pastel Camarão, Pastel Pizza, Pastel Carne de Panela, Pastel Extragrande, Refri, Cervejas, Água Mineral, Sucos, Porções.

**Pastéis com tamanhos (18 produtos)**: P R$ 5,00 / M R$ 15,00 / GG R$ 23,00. O card mostra "A partir de R$ 5,00".

**Produtos com preço único (19)**: Pastel Extragrande R$ 50; 6 refrigerantes lata R$ 5; Cerveja Piriguete R$ 5; Água s/ gás R$ 4 e c/ gás R$ 5 (500ml no nome); 7 sucos (copo) R$ 7; Batata Frita (porção) R$ 15. Tamanhos de uma só opção ("LATA", "COPO", "-") não viram escolha para o cliente.

## Ajustes nos dados do arquivo
- "Pastel Carne de Sol c/ Cream Cheese" aparece duas vezes: será importado uma vez só.
- "Pastel Camarão c/ Queijo" só tem P e M (sem GG): importado assim.
- Nomes convertidos para formato legível (ex.: "Pastel Frango c/ Catupiry").
- Todos os produtos ativos e disponíveis; sem foto (pode-se usar as mesmas fotos de pastel da Pastelão Sousa, se quiser).

## Detalhes técnicos
- Inserções via SQL de dados com `tenant_id = eda33aca-1c7a-45f4-bf47-c368266ef661`: `categories` (kind standard), `products` (type standard, price = menor tamanho), `product_sizes` (P/M/GG, sort 0..2).
- Conferência final por contagem de categorias, produtos e tamanhos.
