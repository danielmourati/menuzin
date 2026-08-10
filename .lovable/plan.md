# E-mails: reset de senha, confirmação de cadastro e contato/suporte

Hoje o app já tem as telas de recuperar/redefinir senha, mas nenhum e-mail sai com a marca Menuzin: o cadastro cria o usuário já confirmado (`email_confirm: true`), não existe página de contato/suporte, e o projeto ainda não tem domínio remetente configurado.

## Pré-requisito: domínio de envio

O projeto já usa `menuzin.app`. O primeiro passo é ativar o subdomínio de envio (ex.: `notify.menuzin.app`) pelo assistente de e-mail. Sem isso, os e-mails de autenticação saem por um remetente genérico da plataforma e e-mails do app não podem ser enviados.

## O que será entregue

**1. Reset de senha (com marca)**
- Templates de e-mail de autenticação personalizados com a identidade do Menuzin (laranja da marca, logo, tom em pt-BR): recuperação de senha, confirmação de cadastro, link mágico, convite, troca de e-mail.
- Fluxo atual `/admin/recuperar-senha` → `/admin/redefinir-senha` mantido, agora com e-mail branded.

**2. Confirmação de cadastro por e-mail**
- Novos lojistas que se cadastram sozinhos (`/comece-agora` e modal rápido) passam a receber um e-mail de confirmação antes de acessar o painel.
- Após confirmar, o usuário cai direto no painel da loja recém-criada.
- Lojas criadas pelo superadmin continuam nascendo já confirmadas (sem e-mail), como hoje.
- Tela de "verifique seu e-mail" com opção de reenviar o link.

**3. Contato / suporte por e-mail**
- Nova página pública `/contato` com formulário (nome, e-mail, WhatsApp, assunto, mensagem), acessível pelo rodapé da home e pelo menu de ajuda do painel.
- Ao enviar: e-mail de notificação para o suporte Menuzin + e-mail de confirmação automático para quem escreveu, ambos com a identidade da marca.
- Mensagens gravadas em uma tabela `support_messages` para não se perder nada, visível para o superadmin em `/platform` (lista simples com status novo/respondido).
- Proteção contra abuso: limite por IP/e-mail e honeypot.

## Detalhes técnicos

- Ativar domínio de envio + infraestrutura de e-mail (fila, log de envios, supressão, unsubscribe) e gerar os templates de autenticação, estilizados a partir dos tokens de `src/styles.css`.
- `src/lib/signup.functions.ts`: trocar `email_confirm: true` por fluxo com confirmação (`emailRedirectTo` para `/admin/login`), mantendo criação de tenant/role. `platform.functions.ts` permanece com confirmação automática.
- Nova rota pública `src/routes/contato.tsx` + `src/lib/support.functions.ts` (server fn com validação Zod) chamando a rota de envio transacional; templates de contato registrados em `src/lib/email-templates/registry.ts`.
- Migração: tabela `public.support_messages` com RLS (insert apenas via server admin, select apenas para `platform_admin`) e GRANTs.
- Rodapé (`LandingSections.tsx`) e sitemap atualizados com `/contato`; head/SEO próprio na nova rota.
