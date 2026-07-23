# Plano: Step "Tipo de Negócio" no modal de cadastro rápido

## Contexto
O modal `QuickSignupModal` (`src/components/landing/QuickSignupModal.tsx`) é o formulário de cadastro do plano **Presença** aberto pela landing `/comece-agora`. Hoje ele exibe todos os campos em uma única tela. A tabela `public.tenants` já possui o campo `business_types text[]`, usado em outras partes do sistema, mas o cadastro público ainda não o coleta.

## Objetivo
Transformar o modal em um wizard de 3 passos, sendo o primeiro a escolha do **Tipo de Negócio** (seleção única, visual igual à referência do anexo).

## Escopo
- Refatorar `QuickSignupModal.tsx` para wizard de 3 steps.
- Reaproveitar a lista de tipos já existente em `src/lib/platform.functions.ts` (`BUSINESS_TYPES`) e seus labels.
- Alterar `signupPresencaTenant` (`src/lib/signup.functions.ts`) para receber o tipo único e salvá-lo como array de um elemento no campo `business_types`.
- Manter compatibilidade com todos os pontos que já leem `business_types` como array.
- Não criar categorias/modelo automaticamente — o tenant nasce vazio, conforme escolha do usuário.

## Design do step
- Grid de 3 colunas com cards clicáveis.
- Cada card exibe um radio button à esquerda e o label à direita.
- Estilo igual à referência: borda arredondada, fundo branco/card, hover com borda primária.
- Tipos disponíveis (labels): Pizzaria, Hamburgueria, Churrascaria, Espetaria, Restaurante, Açaíteria, Sorveteria, Cafeteria, Padaria, Lanchonete, Marmitaria, Sushi/Japonês, Pastelaria, Food Truck, Bar e Petiscaria, Conveniência, Outros.

## Passos do wizard
1. **Tipo de negócio** — seleção obrigatória de um único tipo.
2. **Dados da loja** — Nome do estabelecimento, slug, WhatsApp, cidade.
3. **Sua conta** — e-mail, senha, confirmar senha, aceite dos termos.

## Comportamento
- Indicador de progresso no topo do modal (etapas 1/2/3 ou bolinhas com labels).
- Botões "Voltar" e "Avançar"; no último passo o botão vira "Criar minha loja grátis".
- Só permite avançar se o step atual for válido.
- Ao submeter, a server function recebe `business_type: string` e insere `business_types: [business_type]` no tenant.
- Após sucesso, comportamento atual é preservado: login automático e redirecionamento para `/admin/configuracoes?onboarding=1`.

## Arquivos alterados
- `src/components/landing/QuickSignupModal.tsx` — wizard, step de tipo de negócio e validações por etapa.
- `src/lib/signup.functions.ts` — adicionar `business_type` ao Zod schema e ao INSERT do tenant.

## Não alterar
- Nenhuma migration de schema é necessária (`business_types` já existe).
- Nenhuma política/RLS muda.
- Não se cria categorias padrão automaticamente.

## Validação
- Build (`bun run build` / `lovable-exec test`) sem erros de tipo.
- Modal abre na landing `/comece-agora`, permite navegar pelos 3 passos e cria tenant com `business_types` preenchido corretamente.