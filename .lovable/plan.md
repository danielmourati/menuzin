## Diagnóstico

O instalador atual grava `allowed.pem` em `<install>\override\allowed.pem` e `%APPDATA%\qz\override\allowed.pem`. **Esses não são os caminhos que o QZ Tray 2.2 Community lê** para confiança automática.

O QZ Tray Community carrega a lista de certificados confiáveis de:

- **Per-user:** `%APPDATA%\qz\data\certificates\allowed.pem`
- **System-wide (shared):** `%PROGRAMDATA%\qz\data\certificates\allowed.pem`

Além disso, se o usuário já clicou em **Block** alguma vez no prompt, o cert ficou em `blocked.pem` no mesmo diretório — e `blocked` sempre vence `allowed`. Por isso "Action Required" continua aparecendo mesmo depois do instalador rodar como admin.

## Plano definitivo

### 1. Corrigir caminhos no instalador `.bat` (`src/lib/qz-tray.ts → QZ_INSTALL_PS1`)

Trocar a escrita atual por:

```text
# System-wide (vale para todos os usuários da máquina)
%PROGRAMDATA%\qz\data\certificates\allowed.pem

# Per-user, varrendo C:\Users\*\AppData\Roaming
%APPDATA%\qz\data\certificates\allowed.pem
```

Deixar de gravar em `<install>\override\` e em `%APPDATA%\qz\override\` (caminhos errados que nunca tiveram efeito).

### 2. Remover o cert de `blocked.pem`

Em cada diretório `data\certificates\`:
- Se existir `blocked.pem`, ler, remover qualquer bloco PEM cujo fingerprint bata com o nosso cert, e regravar.
- Se ficar vazio, apagar o arquivo.

Sem isso, mesmo com `allowed.pem` correto, o QZ continua bloqueando.

### 3. Garantir restart do QZ Tray

Já está implementado; manter. Adicionar `Start-Sleep 1500` antes de relançar para evitar lock no `allowed.pem`.

### 4. Marcar versão do instalador

Acrescentar `set "INSTALLER_VERSION=2"` no topo do `.bat` e logar no console PowerShell — assim conseguimos pedir ao usuário pra confirmar que rodou a versão nova.

### 5. UI: validação pós-conexão (em `src/routes/admin.configuracoes.impressora.tsx`)

Já temos a heurística de >2s = "exigiu prompt". Adicionar:

- Se `qzTrustState === "prompted"`, mostrar callout com **2 botões**:
  1. **"Baixar instalador v2"** — usa `downloadQzWindowsInstaller()` (já versionado pela mudança 4).
  2. **"Como remover do bloqueio manual"** — abre o `QzInstallGuide` em uma nova aba/seção explicando: abrir QZ Tray → ícone na bandeja → Site Manager → aba "Blocked" → remover entrada → reiniciar.
- Persistir `qzTrustState === "prompted"` em `localStorage` (chave `qz:last-prompt`) pra que o callout não suma ao recarregar a página antes do usuário rodar o instalador novo.

### 6. Diagnóstico (em `src/components/printer/QzDiagnosticsModal.tsx`)

Adicionar uma seção "Caminhos verificados pelo QZ Tray" com os 2 caminhos corretos (read-only, copiável), pra o admin checar manualmente se precisar.

## Detalhes técnicos

- **Por que `data\certificates\` e não `override\`?** No QZ 2.2 Community, `SiteManager` lê `FileUtilities.getDataDirectory() + "/certificates/allowed.pem"`. `override\` só é usado quando `qz-tray.properties` define `override.crt`, fluxo legado e mais frágil.
- **Por que `%PROGRAMDATA%` e não `<install>`?** O QZ Tray roda como o usuário logado, não como SYSTEM; ele resolve `shared-dir` para `%PROGRAMDATA%\qz` no Windows. Gravar dentro de `Program Files\QZ Tray\` não tem efeito sobre a confiança.
- **Fingerprint match em `blocked.pem`:** comparar pelo SHA-256 do DER do cert (`X509Certificate2::GetCertHashString('SHA256')` em PowerShell) é suficiente — não precisa de parser PEM completo.
- **Sem mudança no backend** (`api.public.qz.ts`, `qz-sign.functions.ts`): cert/chave já estão corretos; o problema é puramente de distribuição no Windows.

## Fora de escopo

- macOS/Linux installers (focar Windows, que é o caso reportado).
- Trocar par cert/chave atual — está válido (não-demo, SHA512, match).
