
## /home alternativo — cadastro rápido no plano Presença

Nova landing focada em conversão instantânea inspirada no menudino.com/restaurante, com animações flutuantes e um modal de cadastro em etapas que cria o tenant no plano **Presença** sem cobrança.

### 1. Nova rota `/comece-agora`
- Arquivo: `src/routes/comece-agora.tsx` (mantém `/` intacto como landing institucional).
- Head SEO próprio: título "Crie seu cardápio digital grátis — Menuzin", meta description e og:tags focadas em "sem taxas, sem comissão".
- Hero de tela cheia com:
  - Headline "Seu cardápio digital no ar em 2 minutos. **Sem taxas. Sem comissão.**"
  - Subhead reforçando plano Presença gratuito.
  - CTA primário grande "Criar meu cardápio grátis" (abre modal).
  - CTA secundário "Ver loja demo".
- Animações flutuantes (CSS keyframes já disponíveis + novas): cards de produtos, badges de pedido, mockup de celular flutuando com `animate-float-slow`, `animate-float-delayed`, gradient blobs animados de fundo.
- Blocos abaixo do hero (compactos, já reaproveitando componentes de `LandingSections`):
  - "Como funciona" (3 passos: cadastre → monte cardápio → receba pedidos WhatsApp).
  - Bullets de benefícios do plano Presença ("0% de comissão", "Link + QR grátis", "Guia Menuzin").
  - Prova social / mini FAQ.
- Header/Footer reutilizados da landing.

### 2. Modal de cadastro rápido (`QuickSignupModal`)
- Componente novo em `src/components/landing/QuickSignupModal.tsx`.
- Baseado em Dialog do shadcn, com transição suave e ilustração lateral no desktop.
- **Etapa única de coleta** (rápido de verdade):
  - Nome do estabelecimento *(gera slug em tempo real, com checagem via `isSlugAvailable`)*
  - WhatsApp (com máscara `maskPhone`)
  - Cidade
  - E-mail
  - Senha + Confirmar senha (validação de força mínima: 8+ caracteres)
  - Checkbox de aceite dos termos.
- Botão "Criar minha loja grátis" — desabilitado até validação completa.
- Estado de loading e mensagens de erro claras.
- Após sucesso: fecha modal, exibe toast "Loja criada! Vamos completar seu perfil." e navega para `/admin/configuracoes`.

### 3. Server function pública `signupPresencaTenant`
- Arquivo: `src/lib/signup.functions.ts` (NOVO, sem `requireSupabaseAuth`).
- Fluxo dentro do handler:
  1. Validação Zod dos inputs.
  2. Reverifica slug livre (`tenants.slug`).
  3. Cria usuário via `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`.
  4. Cria tenant com `plan: "presenca"`, `status: "ativo"`, `active: true`, `directory_opt_in: true`, cores padrão, `logo_letter` do nome.
  5. Atualiza `profiles.tenant_id` do novo user (o trigger `handle_new_user` já cria o profile).
  6. Insere `user_roles(user_id, tenant_id, role: 'owner')`.
  7. O trigger `create_default_subscription_for_tenant` já cria a assinatura Presença.
  8. Retorna `{ tenant_id, slug, email }`.
- Erros mapeados para mensagens em pt-BR (slug em uso, e-mail já cadastrado, senha fraca).

### 4. Auto-login pós-cadastro
- No cliente, após sucesso da server fn, executar `supabase.auth.signInWithPassword({ email, password })` para iniciar sessão imediatamente.
- Em falha do sign-in (raro), redirecionar para `/admin/login` com e-mail pré-preenchido.

### 5. Redirecionamento guiado para completar cadastro
- Após auto-login: `navigate({ to: "/admin/configuracoes" })`.
- Em `src/routes/admin.configuracoes.index.tsx` (alteração mínima):
  - Detectar tenant "recém-criado" via query param `?onboarding=1` ou verificando ausência de `description`/`address`/`hours_schedule`.
  - Exibir banner amigável no topo: "Complete os dados da sua loja para publicar."
  - Ao clicar em **Salvar**, se `?onboarding=1`, disparar próximo passo (item 6).

### 6. Modal "Cadastrar cardápio" após salvar Configurações
- Componente novo `PostConfigNextStepModal` (ou reutilizar Dialog inline).
- Aparece quando o save de configurações concluir com sucesso durante o onboarding.
- Copy: "Ótimo! Agora vamos montar seu cardápio."
- Botões: **"Cadastrar cardápio agora"** (`→ /admin/cardapio/novo?onboarding=1`) e **"Fazer depois"** (`→ /admin/dashboard`).

### 7. Tela final de confirmação no wizard `/admin/cardapio/novo`
- No último passo do wizard, quando `?onboarding=1`:
  - Substituir/estender tela final por resumo do que foi cadastrado (dados da loja + categorias + produtos criados).
  - Dois botões:
    - **"Preview da Loja"** → abre `/$slug` em nova aba.
    - **"Publicar Loja"** → chama `updateMyTenant({ active: true, open_mode: "auto" })`, mostra confetti/toast de sucesso e redireciona para `/admin/dashboard` (limpa `?onboarding`).

### 8. Detalhes técnicos e riscos
- **Auth**: `signupPresencaTenant` é público — validação forte, rate limiting implícito pelo Supabase Auth. Sem exposição de service role no client (só usado dentro do handler).
- **Slug**: reaproveitar `slugify` + `RESERVED_SLUGS`.
- **RLS**: nenhuma alteração — tudo passa pelo `supabaseAdmin` no server.
- **Header start.ts**: nenhuma mudança (fn pública não requer middleware).
- **Router**: adicionar link discreto "Comece grátis" no header da landing atual apontando para `/comece-agora` (não substitui `/`).

### Arquivos afetados
- CRIAR: `src/routes/comece-agora.tsx`
- CRIAR: `src/components/landing/QuickSignupModal.tsx`
- CRIAR: `src/lib/signup.functions.ts`
- EDITAR: `src/routes/admin.configuracoes.index.tsx` (banner + hook pós-save)
- EDITAR: `src/routes/admin.cardapio.novo.tsx` (tela final com Preview / Publicar quando `?onboarding=1`)
- EDITAR: `src/routes/index.tsx` (adicionar link "Comece grátis" no header — opcional/pequeno)
- EDITAR: `src/styles.css` (keyframes float extras, se necessário)
