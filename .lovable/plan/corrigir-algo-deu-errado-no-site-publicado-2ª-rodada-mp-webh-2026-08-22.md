# Corrigir "Algo deu errado" no site publicado (2ª rodada) + MP_WEBHOOK_SECRET

## 1. Diagnóstico confirmado agora

Baixei os bundles do `https://menuzin.app` publicado:

- O build **é o mais recente** (contém as mudanças anteriores: botão "Ir para a home" e a mensagem "Não conseguimos conectar ao servidor do Menuzin").
- Mesmo assim, **as chaves públicas do backend continuam ausentes do bundle**. O código publicado do cliente ficou assim:

```text
var _w = {};                     // process.env vazio no navegador
const e = _w.SUPABASE_URL, t = _w.SUPABASE_PUBLISHABLE_KEY;
if (!e || !t) → "Missing Supabase environment variable(s)…"
```

Ou seja: a parte `import.meta.env.VITE_SUPABASE_URL` foi substituída por indefinido e sobrou só o `process.env`, que no navegador é `{}`.

Causa: no ambiente de build da publicação **nenhuma** das variáveis (`VITE_SUPABASE_URL`, `SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`) está presente quando o `vite.config.ts` é avaliado — o arquivo `.env` que existe aqui no sandbox é ignorado pelo Git (`.gitignore` linhas 34-37), então ele não viaja para a build de produção. Com isso o bloco `publicDefines` que criamos ficou vazio e nada foi injetado. O servidor continua com as variáveis (as funções de servidor respondem 200), o problema é só o bundle do navegador.

## 2. Correção proposta

**Garantir a configuração pública no bundle sem depender do ambiente de build.**

- Em `vite.config.ts`, manter a leitura do ambiente como está, mas adicionar **valores de fallback literais** para a URL do backend e a chave publicável (anon). São valores públicos por definição — já trafegam abertamente no navegador de qualquer app; nenhuma chave de serviço entra no cliente.
- Assim, `publicDefines` nunca fica vazio: quando o ambiente traz as variáveis, elas vencem; quando não traz (caso da publicação), o literal garante que o app funcione.
- Rodar a build de produção aqui **com o ambiente limpo** (simulando a publicação, sem `.env`) e confirmar por `grep` que os assets gerados contêm a URL do backend — essa verificação faltou na rodada anterior e foi por isso que o erro voltou.

Nada muda em `src/integrations/supabase/client.ts` (arquivo gerado) nem no comportamento de sessão/RLS.

## 3. Sobre o `MP_WEBHOOK_SECRET`

Sim, ainda é necessário. A rota `/api/public/menuzin-mp-webhook` hoje está em **fail-open**: sem o segredo, ela registra um aviso no log e aceita a notificação sem validar a assinatura (o risco fica contido porque o pagamento é sempre reconsultado na API do Mercado Pago, mas qualquer pessoa pode disparar essas consultas).

Para fechar:

1. Você abre o painel do Mercado Pago → Suas integrações → aplicação → **Webhooks/Notificações**.
2. Cadastra a URL `https://menuzin.app/api/public/menuzin-mp-webhook` e copia a **chave secreta** que o Mercado Pago mostra ao salvar.
3. Eu abro o formulário seguro para você colar esse valor como `MP_WEBHOOK_SECRET`.
4. A partir daí a rota passa a rejeitar (401) qualquer notificação sem assinatura válida.

Se preferir, faço primeiro só a correção do item 2 e tratamos o segredo depois — a cobrança continua funcionando nesse meio-tempo.

## Validação

- Build de produção local com ambiente sem `.env` → `grep` na pasta de assets confirmando URL e chave publicável presentes.
- Após publicar: recarregar `https://menuzin.app/`, `/guia` e a loja demo, com o console limpo de `Missing Supabase environment variable`.  
  
Sim, vamos primeiro para o item 2.