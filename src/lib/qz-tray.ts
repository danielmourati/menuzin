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
/** Endpoint primário (TanStack server route, Node runtime). */
const QZ_API = "/api/public/qz";
/** URL pública do cert PEM cru — usada pelo instalador .bat e por docs. */
export const QZ_CERT_URL = "/api/public/qz-cert.crt";


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

export async function fetchQzCertificate(): Promise<{
  cert: string;
  configured: boolean;
  subjectCN?: string;
  error?: string;
}> {
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
 * Monta um instalador .bat para Windows que grava o cert em
 * `data/certificates/allowed.pem` — caminho oficial de _persistent trust_ do
 * QZ Tray 2.2 Community (SiteManager).
 *
 * Estratégia (v2):
 *   - Grava system-wide em `%PROGRAMDATA%\qz\data\certificates\allowed.pem`
 *     (vale para todos os usuários da máquina).
 *   - Grava per-user em `%APPDATA%\qz\data\certificates\allowed.pem` para
 *     CADA perfil em C:\Users.
 *   - Remove o nosso cert de `blocked.pem` (caso o usuário tenha clicado em
 *     "Block" — blocked vence allowed).
 *   - Reinicia o QZ Tray ao final.
 *
 * O caminho legado `override/allowed.pem` (usado na v1) NÃO é lido pelo QZ
 * Tray Community — por isso o prompt continuava aparecendo mesmo executando
 * como administrador.
 */
export const QZ_INSTALLER_VERSION = 2;
export function buildQzWindowsInstaller(certPem: string): string {
  const cleanedCert = certPem.replace(/\r\n/g, "\n").trim() + "\n";
  const certB64 = encodeBase64Utf8(cleanedCert);
  const psB64 = encodeBase64Utf16Le(QZ_INSTALL_PS1);
  return [
    "@echo off",
    "setlocal EnableExtensions",
    "chcp 65001 >nul",
    `title Menuzin - Configurar QZ Tray (v${QZ_INSTALLER_VERSION})`,
    "",
    `echo Menuzin QZ Tray Setup - versao ${QZ_INSTALLER_VERSION}`,
    "echo.",
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
    `set "INSTALLER_VERSION=${QZ_INSTALLER_VERSION}"`,
    "",
    `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${psB64}`,
    "set ERR=%ERRORLEVEL%",
    "",
    "echo.",
    "if %ERR% NEQ 0 (",
    "  echo Houve uma falha na configuracao. Codigo: %ERR%",
    ") else (",
    "  echo Configuracao concluida. Volte ao Menuzin e clique em Detectar.",
    "  echo O prompt 'Action Required' nao deve mais aparecer.",
    ")",
    "echo.",
    "pause",
    "endlocal",
    "exit /b %ERR%",
    "",
  ].join("\r\n");
}

/**
 * Script PowerShell que:
 *   1. Grava `allowed.pem` em todos os diretórios `data/certificates/` que o
 *      QZ Tray Community efetivamente lê (per-user e system-wide).
 *   2. Remove o mesmo cert de `blocked.pem` caso ele esteja lá (blocked vence
 *      allowed no QZ Tray).
 *   3. Reinicia o QZ Tray.
 */
const QZ_INSTALL_PS1 = `
$ErrorActionPreference = 'Stop'
try {
  Write-Host ("Menuzin QZ installer - PowerShell stage (v" + $env:INSTALLER_VERSION + ")")
  $certBytes = [Convert]::FromBase64String($env:CERT_B64)
  $certText  = [Text.Encoding]::UTF8.GetString($certBytes)
  $certTrim  = $certText.Trim()

  # Fingerprint SHA-256 do nosso cert (formato XX:XX:...), para comparar com
  # entradas em blocked.pem.
  $certObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 (,$certBytes)
  function Get-Fingerprint([System.Security.Cryptography.X509Certificates.X509Certificate2]$c) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = $sha.ComputeHash($c.RawData)
    ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
  }
  $ourFp = Get-Fingerprint $certObj
  Write-Host ("Fingerprint do cert: " + $ourFp)

  function Ensure-AllowedPem([string]$dataCertDir) {
    try {
      New-Item -ItemType Directory -Path $dataCertDir -Force | Out-Null
      $allowed = Join-Path $dataCertDir 'allowed.pem'
      $write = $true
      if (Test-Path -LiteralPath $allowed) {
        $existing = Get-Content -LiteralPath $allowed -Raw -ErrorAction SilentlyContinue
        if ($existing -and $existing.Contains($certTrim)) { $write = $false }
        elseif ($existing) {
          # Anexa (mantém outros certs ja confiados)
          $merged = ($existing.TrimEnd() + "\`n" + $certTrim + "\`n")
          [IO.File]::WriteAllText($allowed, $merged)
          Write-Host ("Confiado (append): " + $allowed)
          $write = $false
        }
      }
      if ($write) {
        [IO.File]::WriteAllText($allowed, $certTrim + "\`n")
        Write-Host ("Confiado: " + $allowed)
      }
    } catch { Write-Host ("Aviso allowed em " + $dataCertDir + ": " + $_.Exception.Message) }
  }

  function Scrub-BlockedPem([string]$dataCertDir) {
    try {
      $blocked = Join-Path $dataCertDir 'blocked.pem'
      if (-not (Test-Path -LiteralPath $blocked)) { return }
      $content = Get-Content -LiteralPath $blocked -Raw -ErrorAction SilentlyContinue
      if (-not $content) { return }
      # Divide em blocos PEM (-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----).
      $pattern = '(?s)-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----'
      $blocks = [System.Text.RegularExpressions.Regex]::Matches($content, $pattern)
      if ($blocks.Count -eq 0) { return }
      $kept = New-Object System.Collections.ArrayList
      foreach ($m in $blocks) {
        try {
          $pem = $m.Value
          $b64 = ($pem -replace '-----[^-]+-----','' -replace '\s+','')
          $der = [Convert]::FromBase64String($b64)
          $c   = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 (,$der)
          $fp  = Get-Fingerprint $c
          if ($fp -ne $ourFp) { [void]$kept.Add($pem) }
          else { Write-Host ("Removido de blocked: " + $blocked) }
        } catch {
          # Bloco ilegivel: mantem para nao quebrar a config do usuario.
          [void]$kept.Add($m.Value)
        }
      }
      if ($kept.Count -eq 0) {
        Remove-Item -LiteralPath $blocked -Force -ErrorAction SilentlyContinue
        Write-Host ("blocked.pem vazio apos limpeza, removido: " + $blocked)
      } else {
        [IO.File]::WriteAllText($blocked, (($kept -join "\`n") + "\`n"))
      }
    } catch { Write-Host ("Aviso blocked em " + $dataCertDir + ": " + $_.Exception.Message) }
  }

  # 1) System-wide: %PROGRAMDATA%\\qz\\data\\certificates
  $sharedDirs = @()
  foreach ($base in @($env:ProgramData, "$env:SystemDrive\\ProgramData")) {
    if ($base) { $sharedDirs += (Join-Path $base 'qz\\data\\certificates') }
  }

  # 2) Per-user: varre C:\\Users\\*\\AppData\\Roaming\\qz\\data\\certificates
  $userDirs = @()
  $usersRoot = Join-Path $env:SystemDrive 'Users'
  if (Test-Path -LiteralPath $usersRoot) {
    Get-ChildItem -LiteralPath $usersRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notin @('Public','Default','Default User','All Users') -and (Test-Path -LiteralPath (Join-Path $_.FullName 'AppData\\Roaming')) } |
      ForEach-Object {
        $userDirs += (Join-Path $_.FullName 'AppData\\Roaming\\qz\\data\\certificates')
      }
  }

  $allDirs = ($sharedDirs + $userDirs) | Where-Object { $_ } | Select-Object -Unique
  foreach ($d in $allDirs) {
    Ensure-AllowedPem $d
    Scrub-BlockedPem $d
  }

  # 3) Reinicia o QZ Tray. Localiza o executavel pela pasta de instalacao.
  $installCandidates = @()
  foreach ($p in @($env:ProgramW6432, $env:ProgramFiles, \${env:ProgramFiles(x86)}, "$env:SystemDrive\\Program Files", "$env:SystemDrive\\Program Files (x86)", "$env:LocalAppData\\Programs")) {
    if ($p) { $installCandidates += (Join-Path $p 'QZ Tray') }
  }
  try {
    $regKeys = @(
      'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )
    Get-ItemProperty $regKeys -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -like 'QZ Tray*' -and $_.InstallLocation } |
      ForEach-Object { $installCandidates += $_.InstallLocation.TrimEnd('\\') }
  } catch {}
  $installDirs = $installCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

  Get-Process -Name 'QZ Tray','qz-tray' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 1500
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
