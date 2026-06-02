
# Plano — Integração definitiva com QZ Tray

Hoje, ao clicar em **Detectar** / **Testar impressão**, dois problemas acontecem:

1. Se o QZ Tray não estiver aberto, surge o toast cru *"QZ Tray não encontrado…"* sem qualquer orientação ao usuário.
2. Mesmo com QZ Tray aberto, como a app usa modo **unsigned** (`setCertificatePromise(resolve(""))` + `setSignaturePromise(()=>resolve(""))`), o QZ Tray exibe um pop-up de **aceite/permitir** a cada conexão/impressão.

A solução, baseada no guia do Menu Integrado, é distribuir um par **certificado + chave privada** próprio, declarar o `cert.pem` como confiável no QZ Tray do cliente (via `authcert.override=cert.pem`) e fazer a aplicação assinar cada requisição com a chave privada — eliminando os prompts em definitivo.

---

## 1. Gerar par de chaves (uma única vez, fora da app)

Executar localmente (não no projeto), com OpenSSL:

```bash
# chave privada (NUNCA vai pro frontend)
openssl genrsa -out qz-private-key.pem 2048

# certificado público auto-assinado, 20 anos
openssl req -new -x509 -key qz-private-key.pem -out cert.pem -days 7300 \
  -subj "/CN=Menuzin/O=Menuzin/C=BR"
```

Resultado:
- `cert.pem` → distribuído publicamente (vai para o usuário final + servido pela app)
- `qz-private-key.pem` → guardado **apenas** como secret no servidor

Os dois arquivos serão adicionados como **secrets** do Lovable Cloud (`secrets--add_secret`):
- `QZ_CERT_PEM` (conteúdo completo do `cert.pem`)
- `QZ_PRIVATE_KEY_PEM` (conteúdo completo da chave privada)

> Ação para o usuário: rodar os dois comandos `openssl` na própria máquina e me enviar os conteúdos para eu cadastrar como secrets — em nenhum momento a chave privada precisa entrar no repositório.

## 2. Endpoint de assinatura no backend

Criar um server function `signQzRequest` em `src/lib/qz-sign.functions.ts`:

- Entrada: `{ request: string }` (a string que o QZ Tray quer assinar — geralmente um JSON com timestamp + uid + call).
- Lê `process.env.QZ_PRIVATE_KEY_PEM` dentro do `.handler`.
- Usa `crypto.createSign("SHA512")` (algoritmo padrão do QZ 2.1+) para assinar e devolver `{ signature: "<base64>" }`.
- Sem `requireSupabaseAuth`: a assinatura é necessária inclusive antes de o usuário logar para listar impressoras; a chave privada nunca sai do servidor, então o risco é aceitável. Adicionar rate-limit por IP se quisermos endurecer depois.

Também criar um server function `getQzCertificate` que devolve `process.env.QZ_CERT_PEM` como texto, evitando expor o cert.pem como asset estático.

## 3. Reescrever `src/lib/qz-tray.ts`

- Trocar `setCertificatePromise(resolve(""))` por uma promise que faz `await getQzCertificate()` e resolve com o PEM.
- Trocar `setSignaturePromise` por:
  ```ts
  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise((toSign) => (resolve, reject) =>
    signQzRequest({ data: { request: toSign } })
      .then(({ signature }) => resolve(signature))
      .catch(reject),
  );
  ```
- Capturar a falha do `websocket.connect` e re-lançar um erro tipado `QzNotRunningError` em vez da string atual, para a UI poder reagir.

## 4. UX da tela `/configuracoes/impressora`

Substituir o toast cru por um diálogo/alert persistente quando o QZ Tray não responde, contendo:

1. Passo a passo resumido (instalar QZ Tray → baixar `cert.pem` → colar em `C:\Program Files\QZ Tray` → editar `qz-tray.properties` adicionando `authcert.override=cert.pem` → reiniciar QZ Tray).
2. Botão **Baixar cert.pem** (faz `GET` no server function e força download do arquivo).
3. Botão **Baixar qz-tray.properties de exemplo** (gera no cliente um arquivo com `authcert.override=cert.pem`).
4. Link **Baixar QZ Tray** → `https://qz.io/download/`.
5. Botão **Tentar novamente** que reexecuta `ensureQzConnected()`.

Adicionar um card "Status do QZ Tray" no topo da tela com badge **Conectado / Desconectado / Confiável (sem prompts)** baseado em `qz.websocket.isActive()` + tentativa de uma chamada assinada de teste.

## 5. Documentação visível no app

Criar uma seção colapsável "Como instalar e tornar confiável" dentro da própria tela `/admin/configuracoes/impressora`, com o mesmo passo a passo do blog do Menu Integrado adaptado para Menuzin, incluindo o local exato dos arquivos no Windows, macOS e Linux.

---

## Detalhes técnicos

**Arquivos a criar/editar**

- `src/lib/qz-sign.functions.ts` — server functions `signQzRequest`, `getQzCertificate`.
- `src/lib/qz-tray.ts` — passar a usar cert + assinatura reais, expor `QzNotRunningError`, adicionar helper `downloadCertPem()`.
- `src/routes/admin.configuracoes.impressora.tsx` — novo bloco "Status / Instalação", botões de download, dialog de erro, instruções.
- (opcional) `src/components/printer/QzInstallGuide.tsx` para isolar o passo a passo.

**Secrets a cadastrar antes do build**

- `QZ_CERT_PEM`
- `QZ_PRIVATE_KEY_PEM`

**Comportamento esperado após o plano**

- Primeira vez: usuário instala QZ Tray, baixa o `cert.pem` pelo botão da tela, copia para a pasta do QZ Tray, edita o `qz-tray.properties` e reinicia o QZ Tray.
- A partir daí, **nenhum prompt** aparece em conexões/impressões: o QZ Tray valida a assinatura SHA512 feita pelo servidor com a chave privada correspondente ao cert confiável.
- Se o QZ Tray estiver fechado, a UI mostra um dialog com instruções claras e botão *Tentar novamente* — não mais um toast vermelho seco.

---

## O que eu preciso de você antes de implementar

1. Confirmação para eu te orientar a gerar o par `cert.pem` + `qz-private-key.pem` localmente (comandos `openssl` acima) e me enviar os dois conteúdos para eu cadastrar como secrets `QZ_CERT_PEM` e `QZ_PRIVATE_KEY_PEM`.
2. Confirmação de que o endpoint de assinatura pode ficar **público** (sem login) — é o padrão do QZ Tray e mantém a chave privada no servidor. Se preferir restringir, adiciono `requireSupabaseAuth` (mas a tela de configuração precisa estar logada de qualquer forma).

Assim que aprovar, eu implemento tudo em um único passo.
