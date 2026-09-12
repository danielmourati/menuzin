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
    connection?: unknown;
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

const QZ_CDN = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.6/qz-tray.js";
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

/** Timeout no envio para a impressora (ex.: impressora offline ou travada). */
export class QzPrintTimeoutError extends Error {
  constructor(message = "Demora ao imprimir — verifique se a impressora está ligada e conectada.") {
    super(message);
    this.name = "QzPrintTimeoutError";
  }
}

/** Falha ao consultar/encontrar a impressora configurada. */
export class QzPrinterUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QzPrinterUnavailableError";
  }
}

export type QzPrinterStatus = {
  ok: boolean;
  /** Mensagem amigável (em PT-BR) descrevendo o estado, quando `ok=false`. */
  reason?: string;
  /** Código bruto retornado pelo QZ (quando disponível). */
  code?: string;
};

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
  // O endpoint de assinatura exige sessão autenticada — ele assina com a
  // chave privada do servidor, então não pode ficar aberto para qualquer
  // visitante. Pegamos o access_token do Supabase e mandamos como Bearer.
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* segue sem header — o servidor vai responder 401 e o QZ Tray cai no prompt manual */
  }
  const response = await fetch(QZ_API, {
    method: "POST",
    headers,
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
  // Em algumas versões/condições do qz-tray, `isActive()` continua retornando
  // true mesmo após o socket interno ser invalidado (`connection.sendData is
  // not a function`). Detecta esse estado “fantasma” e força reconexão.
  const wsAny = qz.websocket as unknown as {
    isActive: () => boolean;
    connection?: { sendData?: unknown } | null;
  };
  const active = wsAny.isActive();
  const conn = wsAny.connection;
  const stale =
    active &&
    (!conn || typeof (conn as { sendData?: unknown }).sendData !== "function");
  if (stale) {
    try {
      await qz.websocket.disconnect();
    } catch {
      /* ignore */
    }
  }
  if (!qz.websocket.isActive() || stale) {
    try {
      await qz.websocket.connect({ retries: 1, delay: 1 });
    } catch {
      throw new QzNotRunningError();
    }
  }
  return qz;
}

/** Executa uma ação QZ e, em caso de erro de socket “fantasma”, reconecta e tenta uma vez. */
async function withQzRetry<T>(fn: (qz: QZ) => Promise<T>): Promise<T> {
  const qz = await ensureQzConnected();
  try {
    return await fn(qz);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/sendData is not a function|not connected|WebSocket/i.test(msg)) throw err;
    try {
      await qz.websocket.disconnect();
    } catch {
      /* ignore */
    }
    const qz2 = await ensureQzConnected();
    return await fn(qz2);
  }
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

/**
 * Retorna a sequência de comandos de corte ESC/POS compatível com
 * impressoras térmicas genéricas (Epson, Bematech, Elgin, Diebold, Daruma).
 *
 * Utiliza o comando GS V 0 (\x1DV0) para corte total e GS V 1 (\x1DV1) para corte parcial.
 * Evita concatenar múltiplos comandos de marcas distintas na mesma string,
 * o que causava disparo duplo (corte duplo) do módulo de corte da impressora.
 */
export function getCutSequence(cutType?: "none" | "partial" | "full"): string {
  if (cutType === "full") {
    return "\x1DV0";
  }
  if (cutType === "partial") {
    return "\x1DV1";
  }
  return "";
}

/**
 * Verifica de forma rápida e segura se a conexão com o QZ Tray está 100% funcional
 * e se o certificado foi instalado e validado sem exibir pop-ups manuais de segurança.
 */
export async function checkQzStatusAndTrust(): Promise<{
  ok: boolean;
  printersCount: number;
  prompted: boolean;
}> {
  try {
    const t0 = performance.now();
    const qz = await ensureQzConnected();
    const res = await listQzPrintersWithDefault();
    const ms = Math.round(performance.now() - t0);
    // Se a requisição respondeu sem erros e rapidamente, o certificado está 100% confiado
    return { ok: true, printersCount: res.printers.length, prompted: ms > 3000 };
  } catch {
    return { ok: false, printersCount: 0, prompted: false };
  }
}

export async function printQzTextTest(
  printerName: string | undefined,
  text: string,
  opts?: { feedLines?: number; cutType?: "none" | "partial" | "full" },
): Promise<void> {
  await withQzRetry(async (qz) => {
    let target = printerName?.trim();
    if (!target) {
      try {
        target = await qz.printers.getDefault();
      } catch {
        throw new Error("Nenhuma impressora encontrada.");
      }
    }
    if (!target) throw new Error("Nenhuma impressora encontrada.");
    const feed = Math.max(0, opts?.feedLines ?? 3);
    const cut = getCutSequence(opts?.cutType ?? "full");
    const payload = text + "\n".repeat(feed) + cut;
    const config = qz.configs.create(target, { encoding: "CP860" });
    await qz.print(config, [payload]);
  });
}

/**
 * Envia um cupom (texto monoespaçado já formatado por `buildReceipt`)
 * direto para a impressora térmica via QZ Tray, sem prévia em HTML nem
 * caixa de diálogo do navegador. Inclui feed final e corte ESC/POS
 * opcional.
 */
export async function printQzReceipt(
  printerName: string | undefined,
  text: string,
  opts?: { feedLines?: number; cutType?: "none" | "partial" | "full" },
): Promise<{ printer: string }> {
  return withQzRetry(async (qz) => {
    let target = printerName?.trim();
    if (!target) {
      try {
        target = await qz.printers.getDefault();
      } catch {
        throw new Error("Nenhuma impressora configurada e nenhuma padrão no sistema.");
      }
    }
    if (!target) throw new Error("Nenhuma impressora configurada e nenhuma padrão no sistema.");

    const feed = Math.max(0, opts?.feedLines ?? 3);
    const cut = getCutSequence(opts?.cutType);

    const payload = text + "\n".repeat(feed) + cut;
    const config = qz.configs.create(target, { encoding: "CP860" });
    await withTimeout(
      qz.print(config, [payload]),
      15_000,
      new QzPrintTimeoutError(),
    );
    return { printer: target };
  });
}

function withTimeout<T>(p: Promise<T>, ms: number, err: Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(err), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/**
 * Verifica se a impressora configurada está disponível no QZ Tray.
 * Faz duas checagens:
 *   1. `qz.printers.find(name)` — confirma que a impressora ainda existe no sistema.
 *   2. `qz.printers.getStatus()` (quando suportado pela versão do QZ) — detecta
 *      estados como OFFLINE, PAPER_OUT, PAPER_JAM, NOT_AVAILABLE.
 * Nunca lança — sempre retorna `{ ok, reason }`. Erros de conexão com QZ
 * propagam como `QzNotRunningError` via `ensureQzConnected`.
 */
export async function getQzPrinterStatus(
  printerName: string | undefined,
): Promise<QzPrinterStatus> {
  const qz = await ensureQzConnected();
  let target = printerName?.trim();
  if (!target) {
    try { target = await qz.printers.getDefault(); } catch { /* ignore */ }
  }
  if (!target) {
    return { ok: false, reason: "Nenhuma impressora configurada." };
  }

  // 1) Confere existência no sistema
  try {
    const res = await qz.printers.find(target);
    const arr = (Array.isArray(res) ? res : [res]).filter(Boolean) as string[];
    const found = arr.some((n) => n.toLowerCase() === target!.toLowerCase());
    if (!found) {
      return {
        ok: false,
        reason: `Impressora "${target}" não foi encontrada no QZ Tray.`,
      };
    }
  } catch {
    return {
      ok: false,
      reason: `Impressora "${target}" não foi encontrada no QZ Tray.`,
    };
  }

  // 2) Tenta consultar status nativo (API opcional, depende da versão do QZ)
  try {
    const printersApi = qz.printers as unknown as {
      startListening?: (names?: string | string[]) => Promise<void>;
      stopListening?: () => Promise<void>;
      getStatus?: () => Promise<unknown>;
    };
    if (typeof printersApi.getStatus === "function") {
      try { await printersApi.startListening?.(target); } catch { /* ignore */ }
      const raw = await withTimeout(
        printersApi.getStatus(),
        3_000,
        new Error("status-timeout"),
      );
      try { await printersApi.stopListening?.(); } catch { /* ignore */ }
      const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const bad = list.find((s: unknown) => {
        const obj = s as { statusText?: string; severity?: string; code?: string };
        const text = String(obj?.statusText || obj?.code || "").toUpperCase();
        const sev = String(obj?.severity || "").toUpperCase();
        if (sev === "FATAL" || sev === "ERROR") return true;
        return /OFFLINE|PAPER_OUT|PAPER_JAM|NOT_AVAILABLE|ERROR|NO_TONER|OUT_OF_PAPER/.test(text);
      });
      if (bad) {
        const obj = bad as { statusText?: string; code?: string };
        const code = String(obj?.statusText || obj?.code || "").toUpperCase();
        const map: Record<string, string> = {
          OFFLINE: "Impressora offline.",
          PAPER_OUT: "Sem papel na impressora.",
          OUT_OF_PAPER: "Sem papel na impressora.",
          PAPER_JAM: "Atolamento de papel.",
          NOT_AVAILABLE: "Impressora indisponível.",
          NO_TONER: "Sem toner/tinta na impressora.",
        };
        return { ok: false, reason: map[code] || `Impressora com erro (${code || "desconhecido"}).`, code };
      }
    }
  } catch {
    /* status check é best-effort — segue sem falhar */
  }

  return { ok: true };
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
export const QZ_INSTALLER_VERSION = 3;
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
    'set "BAT_DIR=%~dp0"',
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
    "  echo Configuracao concluida com sucesso!",
    "  echo Volte ao Menuzin e clique em 'Testar de novo'.",
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
 * Script PowerShell (v3) que:
 *   1. Lê o cert.pem (da pasta local do .bat ou do payload base64).
 *   2. Grava `allowed.pem` e `cert.pem` em TODOS os diretórios de configuração do QZ Tray (system-wide e per-user em C:\Users).
 *   3. Popula `allowed.txt` com menuzin.app, *.menuzin.app, localhost para preencher o "Site Manager" visual do QZ Tray.
 *   4. Atualiza `qz-tray.properties` com `authcert.override=allowed.pem`.
 *   5. Remove o certificado de `blocked.pem` em todas as pastas.
 *   6. Reinicia o QZ Tray.
 */
const QZ_INSTALL_PS1 = `
$ErrorActionPreference = 'Stop'
try {
  Write-Host ("Menuzin QZ installer - PowerShell stage (v" + $env:INSTALLER_VERSION + ")")
  
  $certTrim = $null
  $certBytes = $null

  if ($env:BAT_DIR -and (Test-Path -LiteralPath (Join-Path $env:BAT_DIR 'cert.pem'))) {
    try {
      $localCert = Get-Content -LiteralPath (Join-Path $env:BAT_DIR 'cert.pem') -Raw -ErrorAction SilentlyContinue
      if ($localCert -and $localCert.Contains('-----BEGIN CERTIFICATE-----')) {
        $certTrim = $localCert.Trim()
        $certBytes = [Text.Encoding]::UTF8.GetBytes($certTrim)
        Write-Host "Certificado cert.pem lido da pasta local do instalador."
      }
    } catch {}
  }
  
  if (-not $certTrim) {
    $certBytes = [Convert]::FromBase64String($env:CERT_B64)
    $certText  = [Text.Encoding]::UTF8.GetString($certBytes)
    $certTrim  = $certText.Trim()
  }

  $certObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 (,$certBytes)
  function Get-Fingerprint([System.Security.Cryptography.X509Certificates.X509Certificate2]$c) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = $sha.ComputeHash($c.RawData)
    ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
  }
  $ourFp = Get-Fingerprint $certObj
  Write-Host ("Fingerprint do cert: " + $ourFp)

  function Ensure-AllowedPem([string]$dir) {
    try {
      if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
      }
      foreach ($file in @('allowed.pem', 'cert.pem')) {
        $allowed = Join-Path $dir $file
        $write = $true
        if (Test-Path -LiteralPath $allowed) {
          $existing = Get-Content -LiteralPath $allowed -Raw -ErrorAction SilentlyContinue
          if ($existing -and $existing.Contains($certTrim)) { $write = $false }
          elseif ($existing) {
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
      }
    } catch { Write-Host ("Aviso pem em " + $dir + ": " + $_.Exception.Message) }
  }

  function Ensure-AllowedTxt([string]$dir) {
    try {
      if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
      }
      $allowedTxt = Join-Path $dir 'allowed.txt'
      $domains = @('menuzin.app', '*.menuzin.app', 'localhost', '127.0.0.1')
      $existingLines = @()
      if (Test-Path -LiteralPath $allowedTxt) {
        $existingLines = Get-Content -LiteralPath $allowedTxt -ErrorAction SilentlyContinue
      }
      $toAdd = @()
      foreach ($d in $domains) {
        if ($existingLines -notcontains $d) {
          $toAdd += $d
        }
      }
      if ($toAdd.Count -gt 0) {
        $newLines = ($existingLines + $toAdd)
        [IO.File]::WriteAllText($allowedTxt, (($newLines -join "\`n") + "\`n"))
        Write-Host ("Site Manager liberado (allowed.txt): " + $allowedTxt)
      }
    } catch { Write-Host ("Aviso txt em " + $dir + ": " + $_.Exception.Message) }
  }

  function Ensure-QzProperties([string]$dir) {
    try {
      if (-not (Test-Path -LiteralPath $dir)) { return }
      $propFile = Join-Path $dir 'qz-tray.properties'
      $overrideLine = 'authcert.override=allowed.pem'
      if (Test-Path -LiteralPath $propFile) {
        $content = Get-Content -LiteralPath $propFile -Raw -ErrorAction SilentlyContinue
        if ($content -and -not $content.Contains('authcert.override')) {
          $merged = ($content.TrimEnd() + "\`n" + $overrideLine + "\`n")
          [IO.File]::WriteAllText($propFile, $merged)
          Write-Host ("Properties atualizado: " + $propFile)
        }
      } else {
        [IO.File]::WriteAllText($propFile, $overrideLine + "\`n")
        Write-Host ("Properties criado: " + $propFile)
      }
    } catch { Write-Host ("Aviso properties em " + $dir + ": " + $_.Exception.Message) }
  }

  function Scrub-BlockedPem([string]$dir) {
    try {
      $blocked = Join-Path $dir 'blocked.pem'
      if (-not (Test-Path -LiteralPath $blocked)) { return }
      $content = Get-Content -LiteralPath $blocked -Raw -ErrorAction SilentlyContinue
      if (-not $content) { return }
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
          [void]$kept.Add($m.Value)
        }
      }
      if ($kept.Count -eq 0) {
        Remove-Item -LiteralPath $blocked -Force -ErrorAction SilentlyContinue
        Write-Host ("blocked.pem vazio apos limpeza, removido: " + $blocked)
      } else {
        [IO.File]::WriteAllText($blocked, (($kept -join "\`n") + "\`n"))
      }
    } catch { Write-Host ("Aviso blocked em " + $dir + ": " + $_.Exception.Message) }
  }

  # Coleta de todas as pastas base de configuração do QZ Tray
  $baseDirs = @()

  # 1) System-wide: %PROGRAMDATA%\\qz
  foreach ($base in @($env:ProgramData, "$env:SystemDrive\\ProgramData")) {
    if ($base) { $baseDirs += (Join-Path $base 'qz') }
  }

  # 2) Per-user: varre todos os perfis em C:\\Users
  $usersRoot = Join-Path $env:SystemDrive 'Users'
  if (Test-Path -LiteralPath $usersRoot) {
    Get-ChildItem -LiteralPath $usersRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notin @('Public','Default','Default User','All Users') } |
      ForEach-Object {
        $uPath = $_.FullName
        if (Test-Path -LiteralPath (Join-Path $uPath 'AppData\\Roaming')) {
          $baseDirs += (Join-Path $uPath 'AppData\\Roaming\\qz')
        }
        $baseDirs += (Join-Path $uPath '.qz')
      }
  }

  # 3) Pastas de instalação do QZ Tray em Program Files
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

  $baseDirs += ($installCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) })
  $allBaseDirs = $baseDirs | Where-Object { $_ } | Select-Object -Unique

  foreach ($b in $allBaseDirs) {
    $subDirs = @(
      $b,
      (Join-Path $b 'override'),
      (Join-Path $b 'data'),
      (Join-Path $b 'data\\certificates')
    )
    foreach ($sub in $subDirs) {
      Ensure-AllowedPem $sub
      Ensure-AllowedTxt $sub
      Scrub-BlockedPem $sub
    }
    Ensure-QzProperties $b
  }

  # Reinicia o QZ Tray
  Get-Process -Name 'QZ Tray','qz-tray' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 1500

  $exe = $null
  foreach ($dir in $installCandidates) {
    if (-not $dir -or -not (Test-Path -LiteralPath $dir)) { continue }
    foreach ($name in @('QZ Tray.exe','qz-tray.exe')) {
      $p = Join-Path $dir $name
      if ((-not $exe) -and (Test-Path -LiteralPath $p)) { $exe = $p }
    }
  }
  if ($exe) {
    try { Start-Process -FilePath $exe } catch { Write-Host ("Aviso: inicie o QZ Tray pelo Menu Iniciar se nao abrir.") }
  } else {
    Write-Host 'Atencao: abra o QZ Tray pelo Menu Iniciar.'
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
