# Continuar a configuração de e-mails do Menuzin

A infraestrutura de e-mail já está criada (fila, log de envios, supressão, descadastro) e o domínio remetente `contato.menuzin.app` está aguardando verificação de DNS. Falta a parte visível: os e-mails em si, com a marca Menuzin, e as ligações com o app.

## O que será entregue

**1. E-mails de autenticação com a marca**
- Templates em pt-BR para: confirmação de cadastro, recuperação de senha, link mágico, convite, troca de e-mail e reautenticação.
- Visual alinhado ao Menuzin: laranja da marca, logo no topo, botão de ação destacado, rodapé simples.
- Encaixa nos fluxos que já existem (`/comece-agora`, `/admin/recuperar-senha` → `/admin/redefinir-senha`).

**2. E-mails do formulário de contato**
- Confirmação automática para quem escreveu ("recebemos sua mensagem"), com o assunto e o texto enviados.
- Notificação para o suporte Menuzin com os dados da mensagem e link para `/platform/suporte`.
- Disparo acontece no mesmo envio que já grava em `support_messages`; se o e-mail falhar, a mensagem continua salva.

**3. Página de descadastro com a marca**
- Página pública para o link de descadastro dos e-mails, com estados de confirmação, já usado/inválido e sucesso.

## Detalhes técnicos

- Rodar o scaffold de templates de autenticação e o scaffold de e-mails transacionais (rotas `/lovable/email/transactional/send`, `preview`, `suppression` e validação de descadastro).
- Templates React Email em `src/lib/email-templates/` (`contact-confirmation.tsx`, `support-notification.tsx` + os de auth), registrados em `registry.ts`, estilos inline derivados dos tokens de `src/styles.css`.
- Helper `src/lib/email/send.ts`; como `/contato` é público, o envio ocorre dentro de `submitSupportMessage` (server fn, service role) com `idempotencyKey` baseado no id da mensagem.
- Novo endereço interno de suporte configurável por constante no servidor (padrão: caixa em `contato.menuzin.app`).
- Nova rota de página de descadastro no caminho informado pelo scaffold, com head/SEO próprio e `noindex`.

## Observação

Os envios só começam a sair depois que a verificação de DNS de `contato.menuzin.app` concluir; o restante pode ser implementado agora e o acompanhamento fica em Cloud → E-mails.
