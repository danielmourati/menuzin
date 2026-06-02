## Problema

O arquivo `C:\Program Files\QZ Tray\qz-tray.properties` fica em uma pasta protegida do Windows. O Bloco de Notas aberto sem privilégio de administrador não consegue salvar nada lá — daí a mensagem "Você não está autorizado a abrir este arquivo".

Editar manualmente exige: clicar com o botão direito no Bloco de Notas → "Executar como administrador" → abrir o arquivo → adicionar a linha → salvar. Para um lojista comum isso é frágil e nada transparente.

## Solução proposta — instalador `.bat` de 1 clique

Em vez de pedir para o usuário editar o arquivo, geramos um instalador que faz tudo sozinho ao ser executado **como administrador**. O usuário só precisa de dois cliques: baixar e "Executar como administrador".

O instalador faz:

1. Detecta a pasta de instalação do QZ Tray (`C:\Program Files\QZ Tray` ou `C:\Program Files (x86)\QZ Tray`).
2. Escreve o `cert.pem` (conteúdo embutido no próprio `.bat`) dentro dessa pasta.
3. Garante a linha `authcert.override=cert.pem` no `qz-tray.properties` (adiciona se faltar, substitui se já existir com outro valor).
4. Reinicia o serviço/processo do QZ Tray para aplicar.
5. Mostra "Configuração concluída" e fecha.

Tudo em UTF-8, com mensagens em português e tratamento de erro (QZ Tray não instalado, etc.).

## Mudanças na tela `/admin/configuracoes/impressora`

No card **Status do QZ Tray**, adicionar um botão principal:

- **Configurar automaticamente (Windows)** → baixa `menuzin-qz-setup.bat` já com o `cert.pem` embutido. Tooltip/legenda: "Clique direito → Executar como administrador".

Manter, como fallback avançado, os botões já existentes (Baixar cert.pem, exemplo `qz-tray.properties`, guia "Como instalar"). Eles ficam num accordion "Instalação manual (avançado)" para não competir com o caminho fácil.

No diálogo **Como instalar** (`QzInstallGuide`), reescrever o passo a passo do Windows para:

```text
1. Instale o QZ Tray (botão).
2. Baixe o instalador da Menuzin (botão).
3. Clique com o botão direito no arquivo → "Executar como administrador".
4. Volte aqui e clique em "Tentar novamente".
```

Os passos antigos (baixar cert.pem, abrir properties, colar linha, reiniciar) viram uma seção colapsável "Prefiro fazer manualmente".

Para macOS/Linux mantemos o fluxo manual atual (lá `sudo` resolve sem fricção e o público é menor), com instruções específicas no mesmo diálogo.

## Detalhes técnicos

**Geração do `.bat`:** feita no cliente, em uma nova função utilitária `buildQzWindowsInstaller(certPem: string): string` em `src/lib/qz-tray.ts`. O `cert.pem` vem do mesmo `getQzCertificate` server function que já existe, então a chave privada continua só no servidor.

**Estrutura do `.bat`:**

```bat
@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

:: 1) detecta pasta
set "QZ_DIR=%ProgramFiles%\QZ Tray"
if not exist "%QZ_DIR%\qz-tray.properties" set "QZ_DIR=%ProgramFiles(x86)%\QZ Tray"
if not exist "%QZ_DIR%\qz-tray.properties" (
  echo QZ Tray nao encontrado. Instale primeiro em https://qz.io/download/
  pause & exit /b 1
)

:: 2) checa admin
net session >nul 2>&1 || (
  echo Execute este arquivo como Administrador ^(clique direito^).
  pause & exit /b 1
)

:: 3) escreve cert.pem via PowerShell (para preservar quebras e UTF-8)
powershell -NoProfile -Command "$c = @'
-----BEGIN CERTIFICATE-----
...conteudo do cert.pem embutido aqui...
-----END CERTIFICATE-----
'@; Set-Content -LiteralPath '%QZ_DIR%\cert.pem' -Value $c -Encoding ascii"

:: 4) garante authcert.override=cert.pem em qz-tray.properties
powershell -NoProfile -Command ^
  "$p='%QZ_DIR%\qz-tray.properties';" ^
  "$lines = if (Test-Path $p) { Get-Content $p } else { @() };" ^
  "$lines = $lines | Where-Object { $_ -notmatch '^\s*authcert\.override\s*=' };" ^
  "$lines += 'authcert.override=cert.pem';" ^
  "Set-Content -LiteralPath $p -Value $lines -Encoding ascii"

:: 5) reinicia QZ Tray
taskkill /IM "QZ Tray.exe" /F >nul 2>&1
start "" "%QZ_DIR%\QZ Tray.exe"

echo Configuracao concluida. Pode fechar esta janela.
pause
```

O arquivo é gerado em memória com `Blob` + `URL.createObjectURL` e baixado com nome `menuzin-qz-setup.bat`.

**Sobre segurança / antivírus:** `.bat` baixado tende a disparar SmartScreen. O texto do botão deixa isso explícito ("o Windows pode pedir confirmação — clique em 'Mais informações' → 'Executar assim mesmo'"). É o mesmo padrão que o próprio QZ Tray usa para o instalador.

**Arquivos tocados:**

- `src/lib/qz-tray.ts` — adiciona `buildQzWindowsInstaller` e `downloadQzWindowsInstaller`.
- `src/components/printer/QzInstallGuide.tsx` — reescreve fluxo do Windows com o novo passo a passo + accordion manual.
- `src/routes/admin.configuracoes.impressora.tsx` — novo botão "Configurar automaticamente (Windows)" no card Status do QZ Tray; reorganiza os botões existentes em "avançado".

Nada de servidor muda — `getQzCertificate` e `signQzRequest` continuam como estão.

## Resultado para o lojista

Fluxo final em Windows, sem editar nada manualmente:

1. Instala QZ Tray.
2. Em `/admin/configuracoes/impressora` clica **Configurar automaticamente (Windows)**.
3. Clica com o botão direito no arquivo baixado → **Executar como administrador**.
4. Volta na tela e clica **Detectar** → status "Conectado — impressão sem prompts".
