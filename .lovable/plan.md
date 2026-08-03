# Persistência universal do cliente + CEP como porta de entrada do Guia

## Objetivo

Guardar, sem fricção, os dados que o cliente já digita no checkout (nome, WhatsApp, último endereço/CEP, últimos pedidos) de forma **universal** — válida em qualquer loja da plataforma — e usar o CEP como chave para o Guia Menuzin saber em qual cidade o cliente está.

Hoje nada disso existe: não há tabela de clientes no banco e o único dado local é o carrinho por loja.

## Como funciona para o cliente

1. No checkout, ele preenche nome/WhatsApp/endereço como já faz hoje. Ao concluir o pedido, esses dados são salvos automaticamente ligados ao número de WhatsApp.
2. Na próxima compra — na mesma loja ou em qualquer outra do Menuzin — os campos vêm preenchidos, com um aviso discreto "Usando seus dados salvos · Alterar / Não sou eu".
3. No Guia, ao entrar sem CEP conhecido, aparece um passo único: "Informe seu CEP para ver o que tem perto de você". Resolvido o CEP, o Guia passa a mostrar a cidade correspondente. O CEP fica salvo e o passo não se repete.
4. Uma área "Meus pedidos" lista os últimos pedidos do cliente em todas as lojas, a partir do WhatsApp salvo.

Nada de cadastro, senha ou e-mail. Sem conta no sistema de autenticação.

## Escopo técnico

### Banco

- Nova tabela `public.customers`: telefone normalizado (único), nome, último CEP, cidade/UF, bairro, último endereço completo (JSON), contadores e datas.
- Nova tabela `public.customer_addresses` (opcional por padrão, 1 por cliente inicialmente): rótulo, CEP, rua, número, bairro, complemento, referência.
- Coluna `customer_id` em `orders`, preenchida no servidor durante a criação do pedido.
- Sem acesso público de leitura: ambas as tabelas ficam sem permissão para visitantes; toda leitura/escrita passa por funções de servidor com chave privilegiada. GRANTs apenas para `service_role`.

### Servidor (`src/lib/customers.functions.ts`)

- `upsertCustomerFromOrder` — chamada de dentro de `createOrder`, grava/atualiza o cliente pelo telefone e devolve `customer_id`.
- `getCustomerByPhone` — busca leve por telefone normalizado, devolvendo somente campos de preenchimento (nome, endereço, CEP), nunca histórico de outras pessoas.
- `listCustomerOrders` — últimos ~20 pedidos do telefone, com nome da loja e status.
- `resolveCityByCep` — usa `cep_ranges` (já existente) e, como fallback, ViaCEP, retornando cidade/UF/bairro.

Como esses dados são acessíveis só pelo telefone, `getCustomerByPhone` e `listCustomerOrders` exigem um **token local de posse** gravado no dispositivo no momento em que o pedido foi criado (campo `device_token` em `customers`, rotativo). Sem o token, o servidor não devolve dados — evita enumerar telefones.

### Cliente

- `src/lib/customer-profile.ts`: cache em `localStorage` sob uma chave global (não por loja) com nome, telefone, CEP, cidade e token de posse; funções de leitura/escrita/limpeza. O backend continua sendo a fonte oficial; o cache é conveniência.
- `CartDrawer.tsx`: pré-preenche nome, WhatsApp e endereço a partir do perfil; mostra o aviso "Usando seus dados salvos · Alterar"; após o pedido, atualiza o cache com o retorno do servidor.
- Nova rota pública `/meus-pedidos`: lista de pedidos entre lojas usando o perfil local + `listCustomerOrders`, com link para o acompanhamento de cada pedido.

### Guia

- `src/lib/guia-location.ts` + componente `CepGateDialog`: exige CEP na primeira visita a `/guia` (e `/guia/$categoria`), resolve cidade via `resolveCityByCep`, grava no mesmo perfil universal.
- Cabeçalho do Guia passa a exibir "Você está em <Cidade/UF> · Trocar".
- As consultas do Guia recebem `city`/`uf`; enquanto os dados ainda são mock, o filtro é aplicado sobre o mock e o ponto de troca para dados reais fica isolado em um único módulo.

## Fora de escopo agora

- Substituir os dados mock do Guia por lojas reais (fica preparado, mas é o próximo passo).
- Verificação por código SMS/WhatsApp do telefone.
- Painel do lojista com base de clientes (CRM).
