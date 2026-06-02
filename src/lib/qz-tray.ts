// Integração com QZ Tray (https://qz.io/) carregada sob demanda via CDN.
// Em vez do modo "unsigned" (que dispara prompt de aceite a cada chamada),
// usamos um par cert.pem + chave privada próprios: o cert é declarado como
// `authcert.override=cert.pem` no QZ Tray do cliente, e a assinatura é feita
// no servidor (server function) com a chave privada correspondente.

type QZ = {
  websocket: {
    isActive: () => boolean;
    connect: (opts?: Record<string, unknown>) => Promise<void>;
    disconnect: () => Promise<void>;
  };
  printers: {
    find: (name?: string) => Promise<string[] | string>;
    getDefault: () => Promise<string>;
  };
  configs: { create: (printer: string, opts?: Record<string, unknown>) => unknown };
  print: (config: unknown, data: unknown) => Promise<void>;
  security: {
    setCertificatePromise: (
      fn: (resolve: (v: string) => void, reject: (e: unknown) => void) => void,
    ) => void;
    setSignatureAlgorithm?: (algo: string) => void;
    setSignaturePromise: (
      fn: (toSign: string) => (resolve: (v: string) => void, reject: (e: unknown) => void) => void,
    ) => void;
  };
};

export type QzPrinter = { name: string; isDefault: boolean };

declare global {
  interface Window {
    qz?: QZ;
  }
}

const QZ_CDN = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
const QZ_API = "/api/public/qz";

/** Erro tipado para a UI distinguir “QZ Tray não está aberto” de outros erros. */
export class QzNotRunningError extends Error {
  constructor(message = "QZ Tray não encontrado. Verifique se o aplicativo está instalado e aberto.") {
    super(message);
    this.name = "QzNotRunningError";
  }
}

let loadingPromise: Promise<QZ> | null = null;
let securityConfigured = false;

function configureSecurity(qz: QZ) {
  if (securityConfigured) return;
  try {
    qz.security.setSignatureAlgorithm?.("SHA512");
  } catch {
    /* ignore — versões antigas usam SHA1 por padrão */
  }
  qz.security.setCertificatePromise((resolve, reject) => {
    fetchQzCertificate()
      .then(({ cert, configured }) => {
        if (!configured || !cert) {
          reject(new Error("Certificado do QZ Tray não configurado no servidor."));
          return;
        }
        resolve(cert);
      })
      .catch(reject);
  });
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    signQzPayload(toSign)
      .then(({ signature, configured }) => {
        if (!configured || !signature) {
          reject(new Error("Assinatura do QZ Tray não configurada no servidor."));
          return;
        }
        resolve(signature);
      })
      .catch(reject);
  });
  securityConfigured = true;
}

async function fetchQzCertificate(): Promise<{ cert: string; configured: boolean }> {
  const response = await fetch(QZ_API, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return parseQzApiResponse(response, "Não foi possível obter o certificado do QZ Tray.");
}

async function signQzPayload(request: string): Promise<{ signature: string; configured: boolean }> {
  const response = await fetch(QZ_API, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ request }),
    cache: "no-store",
  });
  return parseQzApiResponse(response, "Não foi possível assinar a requisição do QZ Tray.");
}

async function parseQzApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }
  return payload as T;
}

function loadQzScript(): Promise<QZ> {
  if (typeof window === "undefined") return Promise.reject(new Error("Sem ambiente de navegador"));
  if (window.qz) {
    configureSecurity(window.qz);
    return Promise.resolve(window.qz);
  }
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<QZ>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-qz-tray="1"]`);
    const onReady = () => {
      if (window.qz) {
        configureSecurity(window.qz);
        resolve(window.qz);
      } else {
        reject(new Error("Falha ao inicializar QZ Tray"));
      }
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("Falha ao baixar QZ Tray")));
      return;
    }
    const s = document.createElement("script");
    s.src = QZ_CDN;
    s.async = true;
    s.dataset.qzTray = "1";
    s.onload = onReady;
    s.onerror = () => reject(new Error("Não foi possível carregar a biblioteca QZ Tray"));
    document.head.appendChild(s);
  });
  return loadingPromise;
}

export async function ensureQzConnected(): Promise<QZ> {
  const qz = await loadQzScript();
  if (!qz.websocket.isActive()) {
    try {
      await qz.websocket.connect({ retries: 1, delay: 1 });
    } catch {
      throw new QzNotRunningError();
    }
  }
  return qz;
}

export async function listQzPrinters(): Promise<string[]> {
  const qz = await ensureQzConnected();
  const res = await qz.printers.find();
  const arr = Array.isArray(res) ? res : [res];
  return arr.filter(Boolean);
}

export async function listQzPrintersWithDefault(): Promise<{
  printers: QzPrinter[];
  defaultPrinter: string | null;
}> {
  const qz = await ensureQzConnected();
  const res = await qz.printers.find();
  const arr = (Array.isArray(res) ? res : [res]).filter(Boolean) as string[];
  let def: string | null = null;
  try {
    def = (await qz.printers.getDefault()) || null;
  } catch {
    def = null;
  }
  return {
    printers: arr.map((name) => ({ name, isDefault: !!def && name === def })),
    defaultPrinter: def,
  };
}

export async function printQzTextTest(
  printerName: string | undefined,
  text: string,
): Promise<void> {
  const qz = await ensureQzConnected();
  let target = printerName?.trim();
  if (!target) {
    try {
      target = await qz.printers.getDefault();
    } catch {
      throw new Error("Nenhuma impressora encontrada.");
    }
  }
  if (!target) throw new Error("Nenhuma impressora encontrada.");
  const config = qz.configs.create(target, { encoding: "CP860" });
  await qz.print(config, [text + "\n\n\n"]);
}

/** Faz o download do cert.pem servido pelo backend. */
export async function downloadQzCertificate(): Promise<void> {
  const { cert, configured } = await fetchQzCertificate();
  if (!configured || !cert) {
    throw new Error(
      "O certificado do QZ Tray ainda não foi configurado no servidor. Contate o administrador.",
    );
  }
  triggerTextDownload("cert.pem", cert);
}

/** Gera localmente um qz-tray.properties pronto com authcert.override=cert.pem. */
export function downloadQzProperties(): void {
  const content =
    "# Adicione esta linha ao arquivo qz-tray.properties existente na pasta\n" +
    "# de instalação do QZ Tray (ou substitua o arquivo por este).\n" +
    "authcert.override=cert.pem\n";
  triggerTextDownload("qz-tray.properties", content);
}

/**
 * Monta um instalador .bat para Windows que delega o trabalho pesado a um
 * bloco PowerShell (passado via -EncodedCommand para evitar problemas de
 * escape no cmd). O script:
 *   - grava cert.pem em %ProgramData%\QZ Tray\cert.pem (caminho estável)
 *   - grava cópia em cada pasta de instalação detectada e em
 *     %APPDATA%\qz de TODOS os perfis de usuário (Windows)
 *   - escreve `authcert.override=<caminho absoluto>` em todos os
 *     qz-tray.properties correspondentes
 *   - reinicia o QZ Tray
 */
export function buildQzWindowsInstaller(certPem: string): string {
  const cleanedCert = certPem.replace(/\r\n/g, "\n").trim() + "\n";
  const certB64 = encodeBase64Utf8(cleanedCert);
  const psB64 = encodeBase64Utf16Le(QZ_INSTALL_PS1);
  return [
    "@echo off",
    "setlocal EnableExtensions",
    "chcp 65001 >nul",
    "title Menuzin - Configurar QZ Tray",
    "",
    "net session >nul 2>&1",
    "if errorlevel 1 (",
    "  echo.",
    "  echo Este instalador precisa ser executado como Administrador.",
    "  echo Feche esta janela, clique com o botao direito no arquivo e escolha",
    '  echo "Executar como administrador".',
    "  echo.",
    "  pause",
    "  exit /b 1",
    ")",
    "",
    `set "CERT_B64=${certB64}"`,
    "",
    `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${psB64}`,
    "set ERR=%ERRORLEVEL%",
    "",
    "echo.",
    "if %ERR% NEQ 0 (",
    "  echo Houve uma falha na configuracao. Codigo: %ERR%",
    ") else (",
    "  echo Configuracao concluida. Volte ao Menuzin e clique em Detectar.",
    "  echo Se o QZ Tray ainda exibir o aviso 'Untrusted website' na primeira",
    "  echo conexao, marque 'Remember this decision' e clique em Allow uma unica vez.",
    ")",
    "echo.",
    "pause",
    "endlocal",
    "exit /b %ERR%",
    "",
  ].join("\r\n");
}

/** Script PowerShell que faz a instalação propriamente dita. */
const QZ_INSTALL_PS1 = `
$ErrorActionPreference = 'Stop'
try {
  $certBytes = [Convert]::FromBase64String($env:CERT_B64)

  # Pasta central estável (sempre legível, mesmo de outro usuário).
  $centralDir = Join-Path $env:ProgramData 'QZ Tray'
  New-Item -ItemType Directory -Path $centralDir -Force | Out-Null
  $centralCert = Join-Path $centralDir 'cert.pem'
  [IO.File]::WriteAllBytes($centralCert, $certBytes)

  function Set-QzProperties([string]$propsPath, [string]$certPath) {
    $dir = Split-Path $propsPath
    if ($dir) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $lines = @()
    if (Test-Path -LiteralPath $propsPath) {
      $lines = Get-Content -LiteralPath $propsPath | Where-Object { $_ -notmatch '^\\s*authcert\\.override\\s*=' }
    }
    $lines += "authcert.override=$certPath"
    Set-Content -LiteralPath $propsPath -Value $lines -Encoding ascii
  }

  # 1) Pastas de instalação do QZ Tray (cobre Program Files, x86, LocalAppData).
  $candidates = @()
  foreach ($p in @($env:ProgramW6432, $env:ProgramFiles, \${env:ProgramFiles(x86)}, "$env:SystemDrive\\Program Files", "$env:SystemDrive\\Program Files (x86)", "$env:LocalAppData\\Programs")) {
    if ($p) { $candidates += (Join-Path $p 'QZ Tray') }
  }
  try {
    $regKeys = @(
      'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )
    Get-ItemProperty $regKeys -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -like 'QZ Tray*' -and $_.InstallLocation } |
      ForEach-Object { $candidates += $_.InstallLocation.TrimEnd('\\') }
  } catch {}
  $installDirs = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

  foreach ($dir in $installDirs) {
    try {
      [IO.File]::WriteAllBytes((Join-Path $dir 'cert.pem'), $certBytes)
      Set-QzProperties (Join-Path $dir 'qz-tray.properties') $centralCert
      Write-Host ("Configurado: " + $dir)
    } catch { Write-Host ("Aviso em " + $dir + ": " + $_.Exception.Message) }
  }

  # 2) Properties machine-wide em %ProgramData%\QZ Tray.
  Set-QzProperties (Join-Path $centralDir 'qz-tray.properties') $centralCert

  # 3) Per-user (%APPDATA%\qz) para TODOS os perfis presentes em C:\\Users.
  $usersRoot = Join-Path $env:SystemDrive 'Users'
  if (Test-Path -LiteralPath $usersRoot) {
    Get-ChildItem -LiteralPath $usersRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notin @('Public','Default','Default User','All Users') -and (Test-Path -LiteralPath (Join-Path $_.FullName 'AppData\\Roaming')) } |
      ForEach-Object {
        $qzDir = Join-Path $_.FullName 'AppData\\Roaming\\qz'
        try {
          New-Item -ItemType Directory -Path $qzDir -Force | Out-Null
          [IO.File]::WriteAllBytes((Join-Path $qzDir 'cert.pem'), $certBytes)
          Set-QzProperties (Join-Path $qzDir 'qz-tray.properties') $centralCert
        } catch {}
      }
  }

  # 4) Reinicia o QZ Tray.
  Get-Process -Name 'QZ Tray','qz-tray' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 800
  $exe = $null
  foreach ($dir in $installDirs) {
    foreach ($name in @('QZ Tray.exe','qz-tray.exe')) {
      $p = Join-Path $dir $name
      if ((-not $exe) -and (Test-Path -LiteralPath $p)) { $exe = $p }
    }
  }
  if ($exe) {
    try { Start-Process -FilePath $exe } catch { Write-Host ("Nao foi possivel iniciar o QZ Tray automaticamente: " + $_.Exception.Message) }
  } else {
    Write-Host 'Atencao: nao encontrei o executavel do QZ Tray. Abra-o manualmente pelo Menu Iniciar.'
  }

  exit 0
} catch {
  Write-Host ('Erro: ' + $_.Exception.Message)
  exit 1
}
`;

function encodeBase64Utf8(s: string): string {
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(s)));
  }
  return Buffer.from(s, "utf-8").toString("base64");
}

function encodeBase64Utf16Le(s: string): string {
  const bytes = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    bytes[i * 2] = c & 0xff;
    bytes[i * 2 + 1] = (c >> 8) & 0xff;
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  if (typeof btoa === "function") return btoa(bin);
  return Buffer.from(bin, "binary").toString("base64");
}

/** Baixa o instalador .bat (Windows) com o cert.pem embutido. */
export async function downloadQzWindowsInstaller(): Promise<void> {
  const { cert, configured } = await fetchQzCertificate();
  if (!configured || !cert) {
    throw new Error(
      "O certificado do QZ Tray ainda não foi configurado no servidor. Contate o administrador.",
    );
  }
  // PowerShell here-string '@... '@ — antes de fechar precisa estar em sua própria linha.
  // O builder já trim() o cert, então a linha de fechamento fica isolada.
  const bat = buildQzWindowsInstaller(cert);
  // .bat precisa de encoding ANSI/ASCII para o cmd interpretar corretamente.
  const blob = new Blob([bat], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "menuzin-qz-setup.bat";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function triggerTextDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
