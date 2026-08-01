# Conexão Mercado Pago (OAuth) — deixar pronta, sem conectar agora

Encerrar a implementação neste ponto: a rota e o fluxo de conexão ficam prontos para o admin do tenant usar quando quiser, sem nenhuma conta Mercado Pago conectada agora e sem pedir credenciais da plataforma neste momento.

## O que já está pronto

- Rota pública de retorno do Mercado Pago (`/api/public/mp-oauth-callback`), que troca o código pelo token, salva de forma criptografada e avisa a janela do painel.
- Função de servidor que inicia a conexão (gera estado seguro de uso único e monta a URL de autorização).
- Botão "Conectar minha conta Mercado Pago" no painel do lojista abrindo pop-up e atualizando o status ao concluir.
- Tokens guardados criptografados, com renovação automática antes de expirar.
- Aba "Credenciais Manuais" continua funcionando como alternativa.

## O que falta (fica para quando você quiser ativar)

Cadastrar as credenciais da aplicação Mercado Pago da plataforma (`MP_CLIENT_ID` e `MP_CLIENT_SECRET`). Enquanto não existirem, o fluxo não deve dar erro técnico.

## Ajuste final deste plano

1. Quando as credenciais da plataforma não estiverem cadastradas, o botão de conexão automática aparece desabilitado com aviso claro: "Conexão automática ainda não habilitada pela plataforma — use Credenciais Manuais", em vez de abrir pop-up e falhar.
2. Nada é alterado em lojas já conectadas por credenciais manuais.
3. Nenhuma conta Mercado Pago é conectada nesta etapa.

## Detalhes técnicos

- Nova função de servidor leve `getMpOAuthAvailability` em `src/lib/payments.functions.ts`, retornando `{ available: boolean }` a partir da presença de `MP_CLIENT_ID`/`MP_CLIENT_SECRET` (lido dentro do handler).
- `src/routes/admin.configuracoes.pagamentos.tsx` consulta essa flag no carregamento e passa para `MercadoPagoStatus` para desabilitar o botão OAuth + exibir o aviso.
- `src/lib/mp-oauth.server.ts` mantém o erro atual como proteção do servidor; a UI passa a evitar chegar nele.
- Sem migrações e sem novos segredos nesta etapa.
