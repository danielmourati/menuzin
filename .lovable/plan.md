# Ajustes: categorias do Guia, tipos de negócio na loja e dados do cadastro

## 1. Categorias do Guia vindas do banco (anexo 1)

Hoje o seletor "Categoria" em **Guia Menuzin > Produtos publicados no Guia** usa uma lista fixa escrita no código (Quentinhas, Pizza, Churrasco, Hambúrguer, Lanches, Marmitex, Açaí, Doces), que pode não corresponder ao que o superadmin cadastrou em Plataforma > Guia > Categorias.

O que muda:
- O dropdown passa a listar somente as categorias **ativas** cadastradas no banco (mesmas do Guia público), com emoji e nome.
- A validação no servidor também passa a aceitar apenas essas categorias ativas.
- Se um produto estiver com uma categoria que não existe mais, o campo aparece vazio com aviso "categoria removida — escolha outra".
- Se ainda não houver nenhuma categoria cadastrada, o bloco mostra uma mensagem orientando que a plataforma ainda não publicou categorias.

## 3. Endereço completo no auto-cadastro (anexo 3)

O cadastro rápido (/comece-agora) coleta hoje apenas cidade, por isso Endereço e UF chegam vazios em Configurações.

O que muda no formulário de cadastro:
- Novo passo/campos: **CEP**, **Endereço (rua e número)**, **Bairro**, **Cidade** e **UF**.
- Ao digitar o CEP, os campos de rua, bairro, cidade e UF são preenchidos automaticamente (mesma consulta de CEP já usada no checkout); o lojista completa o número.
- Cidade/UF continuam editáveis caso o CEP não retorne resultado.
- Esses dados são gravados na loja no momento da criação, de modo que **Configurações** já abre com Endereço, Cidade, UF e Bairro preenchidos — junto com nome, WhatsApp e tipo de negócio que já eram salvos.

## Detalhes técnicos

- `src/lib/directory-admin.functions.ts`: `listMyDirectoryProducts` passa a retornar também as categorias ativas de `guia_categories`; `updateDirectoryProduct` valida contra esse conjunto em vez de `DIRECTORY_CATEGORIES`.
- `src/routes/admin.diretorio.tsx`: `Select` de categoria alimentado pela lista retornada do servidor.
- `src/lib/directory.functions.ts`: `listCategories` continua igual (já lê do banco para o Guia público); a constante fixa deixa de ser usada como fonte de verdade no painel do lojista.
- `src/routes/$slug.tsx` (+ `StoreAboutDrawer.tsx`): renderiza `tenant.business_types` com `BUSINESS_TYPE_LABELS`; requer expor `business_types` no retorno público da loja em `src/lib/catalog.functions.ts` caso ainda não venha.
- `src/lib/signup.functions.ts`: schema ganha `cep`, `address`, `neighborhood`, `state` (opcionais) e grava em `tenants`.
- `src/components/landing/QuickSignupModal.tsx`: novos campos com autopreenchimento via `src/lib/viacep.ts`.
- Sem alterações de schema no banco (colunas `address`, `state`, `neighborhood`, `cep` já existem em `tenants`).
