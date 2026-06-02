## Diagnóstico definitivo

A captura do diálogo "Action Required" mostra **"Verified by QZ Industries, LLC"**. Esse texto é extraído do `Subject` / `Issuer` do certificado que o app envia via `qz.security.setCertificatePromise`. "QZ Industries, LLC" é o sujeito do **certificado de demonstração** que vem dentro do pacote do QZ Tray (`digital-certificate.txt` + `private-key.pem`).

Conclusão: o segredo `QZ_CERT_PEM` configurado hoje contém o cert demo do QZ — e ele é explicitamente bloqueado pelo QZ Tray como _untrusted_, **não pode ser confiado via `authcert.override`** nem por nenhum outro caminho. Enquanto esse cert estiver no servidor, o prompt vai aparecer em toda conexão, em qualquer Windows, com ou sem instalador. Nenhum ajuste de path resolve isso.

## Plano de correção

### 1. Gerar um par cert + chave próprios do Menuzin (uma vez)

Rodar localmente (ou via script utilitário dentro do projeto, em `scripts/generate-qz-cert.mjs`) usando OpenSSL/`node:crypto`:

```text
- Self-signed RSA 2048, SHA-512
- CN=Menuzin, O=Menuzin, validade 10 anos
- Saída: menuzin-qz.crt (PEM) + menuzin-qz.key (PEM, sem passphrase)
```

Isso produz um certificado cujo Subject será `CN=Menuzin` — quando o QZ Tray validar a assinatura, o diálogo (se ainda aparecer numa máquina não configurada) vai mostrar "Verified by Menuzin", confirmando que o cert correto está em uso.

### 2. Atualizar os segredos do Lovable Cloud

Substituir os valores atuais:
- `QZ_CERT_PEM` ← conteúdo de `menuzin-qz.crt`
- `QZ_PRIVATE_KEY_PEM` ← conteúdo de `menuzin-qz.key`

(Feito via o tool de secrets; o usuário cola os PEMs gerados.)

### 3. Endurecer o endpoint de assinatura

Em `src/routes/api.public.qz.ts` adicionar uma validação de _startup_: ao carregar a chave, conferir que `createPublicKey(cert).export === createPublicKey(privateKey).export`. Se não baterem, devolver `configured: false` com um log explícito `[qz-api] cert/key mismatch`. Evita o cenário silencioso de subir um par desalinhado.

Adicionar também uma checagem rápida que recusa explicitamente o cert demo do QZ — se o Subject contiver "QZ Industries", responder `configured: false` com mensagem clara, para falhar cedo em qualquer regressão futura.

### 4. Expor o fingerprint do cert no modal de diagnóstico

O `QzDiagnosticsModal.tsx` já calcula o SHA-256 do cert do servidor. Adicionar ao lado:
- **Subject CN** extraído do PEM (parser leve via `pkijs` ou regex no DER base64 — mas mais simples: já temos os campos exibidos, basta destacar o CN no topo em cor de aviso quando contiver "QZ Industries").
- Bloco visual vermelho: _"⚠️ Você está usando o certificado de demonstração do QZ Tray. O prompt 'Untrusted website' não desaparece com esse cert. Gere um cert próprio (ver instruções)."_

Isso dá ao usuário um sinal inequívoco quando o segredo está errado.

### 5. Reescrever o instalador Windows (`buildQzWindowsInstaller`) para o caminho correto e único

Com cert próprio em mãos, simplificar o PowerShell para o que o QZ Tray realmente lê (validado contra o código-fonte do QZ Tray 2.2):

```text
- Copiar cert.pem para:  C:\Program Files\QZ Tray\override\allowed.pem
                         C:\Program Files (x86)\QZ Tray\override\allowed.pem
- (fallback) %APPDATA%\qz\override\allowed.pem para cada perfil
- NÃO mexer em qz-tray.properties (authcert.override é overridable, mas a
  pasta override/allowed.pem é o caminho first-class que o QZ Tray sempre
  inspeciona — independe de properties)
- Reiniciar QZ Tray
```

Esse caminho `override/allowed.pem` é o mecanismo de _persistent trust_ documentado pelo QZ Tray para Community Edition e dispensa qualquer edição de properties. É o que o checkbox "Remember this decision" grava internamente quando o cert NÃO é o demo.

### 6. Atualizar a UI da tela de configuração

Em `src/routes/admin.configuracoes.impressora.tsx`:
- Renomear o botão para **"Baixar instalador de confiança (Windows)"**
- Adicionar passo numerado: 1) Baixar instalador, 2) Botão direito → Executar como administrador, 3) Voltar e clicar Detectar
- Mostrar inline (lendo do endpoint `/api/public/qz`) o CN do cert atual e um badge verde "Certificado próprio ativo" ou vermelho "Certificado de demonstração detectado".

### 7. Verificação final

Após aplicar 1-6, fluxo esperado:
- Diagnóstico mostra "Certificado próprio ativo (CN=Menuzin)"
- Em máquina nova sem instalador: prompt aparece, mas agora diz "Verified by Menuzin" — usuário marca "Remember this decision" + Allow uma vez → nunca mais aparece (porque QZ Tray grava o cert em `override/allowed.pem` automaticamente quando o cert não é o demo)
- Em máquina com instalador rodado: nenhum prompt aparece, nem na primeira conexão

## Detalhes técnicos

**Arquivos alterados:**
- `scripts/generate-qz-cert.mjs` (novo, utilitário one-shot para gerar o par)
- `src/routes/api.public.qz.ts` (validação cert/key match + recusa do demo cert)
- `src/lib/qz-tray.ts` (`buildQzWindowsInstaller` reescrito para `override/allowed.pem`)
- `src/components/printer/QzDiagnosticsModal.tsx` (banner de alerta para cert demo)
- `src/routes/admin.configuracoes.impressora.tsx` (instruções numeradas + badge do cert)

**Secrets atualizados (ação do usuário):** `QZ_CERT_PEM`, `QZ_PRIVATE_KEY_PEM`

**Sem mudanças em:** schema do banco, RLS, edge functions, autenticação.

## O que preciso de você antes de implementar

Posso gerar o script `scripts/generate-qz-cert.mjs` e te entregar os dois PEMs prontos no chat (eu rodo o script aqui no sandbox) — você só cola nos segredos. Confirma essa abordagem? Ou prefere gerar o par localmente na sua máquina com OpenSSL e me passar os valores?