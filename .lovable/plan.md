# Verificação de novas contas por WhatsApp via Evolution API

## Onde instalar a Evolution API (responde à dúvida de hospedagem)

A Evolution API é um servidor separado que precisa estar na internet com URL pública (HTTPS) para o app Lovable conseguir chamá-lo. Opções recomendadas, em ordem:

1. **VPS com Docker (recomendado)** — Hostinger, Contabo, Hetzner ou DigitalOcean (~R$ 30–60/mês). Sobe com `docker compose` (imagem oficial `atendai/evolution-api`), aponta um subdomínio tipo `evolution.menuzin.app` na Cloudflare com HTTPS. Requisitos mínimos: 1 GB RAM, 1 vCPU.
2. **Serviço gerenciado** — Easypanel, Coolify ou Railway com template pronto da Evolution API; menos manutenção, custo um pouco maior.
3. **Provedor de Evolution hospedada** — empresas brasileiras que já vendem a instância pronta; zero instalação, só pega URL + chave de API.

Depois de no ar, é preciso **criar a instância "menuzin" e conectar um número de WhatsApp escaneando o QR Code** na interface da Evolution (WhatsApp Business de um chip dedicado, nunca o número pessoal — risco de banimento se usar para disparos demais).

## O que já existe no projeto

- Cliente da Evolution (`evolution-client.server.ts`) com envio humanizado e anti-banimento.
- Tabela `whatsapp_otp_codes` e funções `sendWhatsappOtp` / `verifyWhatsappOtp` (código de 6 dígitos, expira em 10 min, máx. 3 tentativas, rate limit).
- Página do lojista Configurações > WhatsApp com status da conexão e envio de teste.
- Tudo desligado atrás da variável `ENABLE_WHATSAPP_OTP` (hoje `false`).

## O que falta (o que este plano implementa)

1. **Configurar os secrets no Lovable Cloud**: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` e ativar `ENABLE_WHATSAPP_OTP=true`. Você informa URL e chave depois de instalar a API; eu cadastro pelo cofre de secrets.
2. **Verificação no cadastro de nova loja** (`/comece-agora` e cadastro rápido): hoje o cadastro só exige confirmação de e-mail. Vou adicionar uma etapa de código de 6 dígitos enviado ao WhatsApp do lojista:
   - Novas funções públicas (sem login) `sendSignupWhatsappOtp` / `verifySignupWhatsappOtp` em `src/lib/otp.functions.ts`, usando o número digitado no formulário, com o mesmo rate limit e reaproveitando `whatsapp_otp_codes`.
   - No formulário de cadastro, após preencher os dados, abre etapa "Confirme seu WhatsApp" com campo de código, botão reenviar (com contagem regressiva) e fallback "Não recebi? Enviar por link wa.me".
   - O cadastro só conclui (`signupPresencaTenant`) depois do código validado — o tenant já nasce com `whatsapp_verified = true`.
   - Se a Evolution estiver fora do ar, o envio falha com mensagem clara e opção de tentar depois (não bloqueia a criação quando `ENABLE_WHATSAPP_OTP=false`).
3. **Teste de ponta a ponta**: cadastro real de loja de teste com envio e validação do código, via Playwright.

## Decisões já tomadas

- Mantida também a confirmação por e-mail (WhatsApp vira etapa adicional, não substituta).
- Verificação acontece **antes** de criar a conta, evitando lojas fantasmas com número errado.

## Detalhes técnicos

- Secrets via ferramenta de secrets do Lovable (nunca no código nem no repositório).
- Funções de OTP do cadastro são públicas: rate limit por IP + número (3 envios/10 min) obrigatório, código nunca retornado em produção.
- Nenhuma Edge Function do Supabase — tudo via `createServerFn` no padrão do projeto.
- `.env.example` atualizado com as novas variáveis.

## Fora de escopo

- Notificações de pedidos por WhatsApp (já existe página de configuração; evoluir depois).
- Mensageria automatizada de marketing/cobrança.
