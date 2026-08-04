# Guia Menuzin: busca, mensagens, notificações, conta e auditoria de categorias

## 1. Busca de lojas e pratos

- Novo servidor `searchGuia` (`src/lib/guia.functions.ts`): consulta única sobre `directory_public` filtrando por nome do produto, nome da loja e bairro (limite ~40), agrupando o resultado em **Lojas** e **Pratos**.
- Header do Guia: o input hoje é decorativo. Passa a abrir um painel de resultados (overlay) com debounce de ~250ms, estados vazio/carregando, e navegação direta para `/$slug` (loja) ou `/guia/produto/$id` (prato).
- Rodapé (navbar mobile): a aba "busca" passa a focar/abrir o mesmo painel.
- Resultados respeitam a cidade salva do cliente quando houver.

## 2. Ícone de mensagens

Ativa como central de contato com as lojas: abre uma folha lateral listando as lojas dos últimos pedidos do cliente (via `listCustomerOrders`, que já existe e usa o token do dispositivo), cada uma com botão "Falar no WhatsApp" (`wa.me` da loja) e link para o acompanhamento do pedido. Sem histórico salvo, mostra estado vazio com atalho para o suporte Menuzin.

## 3. Ícone de notificações

Ativa com dados reais em vez do badge fixo "6": lista os pedidos recentes do cliente com mudança de status (aceito, saiu para entrega, pronto, finalizado, cancelado) e os destaques/ofertas relâmpago ativos do Guia. O badge passa a contar apenas itens não vistos, marcando o último acesso em `localStorage`. Sem novidades, o badge some.

## 4. Chips mercados / conveniências

Hoje os três chips são fixos e não filtram nada. Passam a ser derivados de `tenants.business_types`: "restaurantes" agrupa os tipos de alimentação, "mercados" e "conveniências" só aparecem se existir loja ativa com o tipo correspondente. Selecionar um chip filtra a listagem de lojas e as categorias exibidas.

## 5. Esconder contagens

Remove o "N opções" abaixo de cada categoria e o contador de itens (ícone de bike) nos cartões de loja, tanto em grade quanto em lista. A contagem continua sendo usada internamente apenas para decidir se a categoria aparece.

## 6. Auditoria de categorias por produto

Verificado no banco: a Burguer Prime aparece em "pizza" porque os produtos *Refrigerante Lata* e *Suco Natural* foram marcados com `directory_category = 'pizza'` pelo preenchimento automático anterior. O mesmo tipo de erro atinge outras lojas (ex.: item de "lanches" na Churrascaria Vila Boêmia).

Correção:
- Migração de reclassificação: recalcula `directory_category` a partir do nome do produto e do nome da categoria interna do produto, com regras mais estritas e desempate pelo `business_types` da loja; produtos sem correspondência clara (bebidas, sobremesas avulsas, adicionais) ficam sem categoria de diretório e deixam de gerar categoria falsa.
- A tela `/admin/diretorio` continua permitindo ao lojista corrigir manualmente a categoria de cada produto.
- Um resumo "categorias x produtos" fica disponível no painel do superadmin em `/platform/guia` para auditoria futura.

## 7. CEP pedido só uma vez

- O perfil universal (`menuzin:customer:v1`) passa a ser lido de forma tolerante: qualquer CEP salvo, mesmo sem cidade resolvida, já conta como localização definida.
- O diálogo só abre automaticamente quando não existe CEP salvo; depois disso, só via clique em "trocar" no cabeçalho.
- Guarda também um marcador de "gate já respondido" para não reabrir caso a resolução de cidade falhe, e passa a sincronizar o CEP salvo no checkout com o do Guia (e vice-versa).

## 8. Conta do cliente

- Nova rota pública `/minha-conta`: mostra os dados já conhecidos (nome, WhatsApp, CEP, cidade/UF, bairro, endereço), permite editar e completar com e-mail e data de nascimento, além de links para "Meus pedidos" e "Sair deste dispositivo".
- Migração: colunas `email` e `birthdate` em `public.customers`; a função de salvar perfil passa a aceitar esses campos.
- O ícone de usuário do rodapé do Guia passa a apontar para essa rota; sem perfil salvo, a tela explica que os dados aparecem após o primeiro pedido e oferece informar o WhatsApp.

## Detalhes técnicos

- Arquivos principais: `src/routes/guia.index.tsx`, `src/lib/guia.functions.ts`, `src/lib/directory.functions.ts`, `src/components/guia/CepGateDialog.tsx`, `src/lib/customer-profile.ts`, `src/lib/customers.functions.ts` / `.server.ts`, nova rota `src/routes/minha-conta.tsx`, novos componentes em `src/components/guia/` (busca, mensagens, notificações).
- Duas migrações: reclassificação de `products.directory_category` e novas colunas em `customers` (sem acesso público; leitura só por token, como hoje).
- Nenhuma alteração no fluxo de pedidos ou pagamentos.
