## Objetivo

1. Eliminar o modal "Action Required — Untrusted website" do QZ Tray (atual: aparece a cada conexão).
2. Após detecção, permitir **selecionar** a impressora a partir das que o QZ Tray retornou do sistema (hoje o campo é texto livre).

---

## Diagnóstico do modal "Untrusted website"

O QZ Tray só pula esse modal quando o certificado que assina as requisições é **explicitamente confiado**. Hoje o instalador grava `cert.pem` e `authcert.override=cert.pem` apenas em `C:\Program Files\QZ Tray\qz-tray.properties`. Isso falha em dois cenários comuns:

- **Caminho relativo `cert.pem`**: o QZ Tray procura relativo ao working dir do processo, não à pasta de instalação — quando inicia via atalho, o cert não é encontrado e o app cai no fluxo "unsigned" (que sempre pede aceite).
- **Properties por usuário sobrepondo**: a partir do 2.2.x o QZ Tray também lê `%APPDATA%\qz\qz-tray.properties` e `%ProgramData%\QZ Tray\qz-tray.properties`. Se algum desses existir sem o override, a configuração global é ignorada.

Resultado: o cert é carregado parcialmente, a assinatura é validada (não dá "Failed to sign"), mas o cert não está na trust store → prompt "Untrusted website" toda vez.

---

## Correção 1 — Confiança permanente do certificado

Atualizar `buildQzWindowsInstaller()` em `src/lib/qz-tray.ts` para:

1. Gravar `cert.pem` em **três** locais (cobre todas as variantes de instalação/perfil):
   - `%QZ_DIR%\cert.pem` (pasta de instalação)
   - `%ProgramData%\QZ Tray\cert.pem` (machine-wide)
   - `%APPDATA%\qz\cert.pem` (per-user, do usuário que rodou o .bat — usar o `%USERPROFILE%` real, não o do Admin elevado: capturar via `for /f` em `whoami` antes do UAC ou usar `%SendTo%\..\..\AppData\Roaming\qz`).
2. Para cada `qz-tray.properties` correspondente, remover linhas `authcert.override=` antigas e gravar **com caminho absoluto**:
   ```
   authcert.override=C:\ProgramData\QZ Tray\cert.pem
   ```
   (usar sempre o caminho do `%ProgramData%`, que é estável e legível por qualquer usuário).
3. Manter o restart do QZ Tray já implementado.
4. Mensagem final no .bat: instruir o usuário a clicar **Allow + Remember this decision** **uma única vez** caso ainda apareça o prompt no primeiro reinício (a partir daí entra em `allowed.dat`).

Nenhuma mudança em `src/routes/api.public.qz.ts` — a assinatura server-side já está correta.

---

## Correção 2 — Seleção de impressoras detectadas

Em `src/routes/admin.configuracoes.impressora.tsx`:

- Após `handleDetectQz` popular `qzPrinters`, trocar o `<Input>` do campo **"Nome da impressora"** por um padrão híbrido:
  - Se `qzPrinters.length > 0`: renderizar um `<Select>` com as impressoras detectadas + um item final `"✏️  Digitar manualmente…"` que volta para o `<Input>` livre.
  - Se vazio (ainda não detectou ou QZ offline): manter o `<Input>` atual.
- Marcar a impressora padrão do sistema (já obtida via `qz.printers.getDefault()`) com sufixo "(padrão)" — adicionar um pequeno wrapper em `listQzPrinters` para retornar `{ name, isDefault }[]` ou retornar separadamente `defaultPrinter`.
- Persistir a escolha em `form.printer_name` como hoje (string), nenhuma migração de schema.
- Auto-selecionar a padrão quando `form.printer_name` está vazio (já existe lógica parecida — ajustar para usar a default em vez de `list[0]`).

---

## Arquivos alterados

- `src/lib/qz-tray.ts` — `buildQzWindowsInstaller()` reescrito; `listQzPrinters()` passa a expor a impressora padrão.
- `src/routes/admin.configuracoes.impressora.tsx` — campo de impressora vira Select quando há detecção; auto-seleção da padrão.

Sem mudanças de backend, schema, secrets ou rotas.
