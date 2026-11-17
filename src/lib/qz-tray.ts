// Integração com QZ Tray (https://qz.io/) carregada sob demanda via CDN.
// Em vez do modo "unsigned" (que dispara prompt de aceite a cada chamada),
// usamos um par cert.pem + chave privada próprios: o cert é declarado como
// `authcert.override=cert.pem` no QZ Tray do cliente, e a assinatura é feita
// no servidor (server function) com a chave privada correspondente.
import { printerReset } from "@/lib/escpos-format";

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
  constructor(
    message = "QZ Tray não encontrado. Verifique se o aplicativo está instalado e aberto.",
  ) {
    super(message);
    this.name = "QzNotRunningError";
  }
}

/** Erro tipado para conexão recusada/bloqueada por certificado não confiável. */
export class QzCertificateRejectedError extends Error {
  constructor(
    message = "Conexão recusada pelo QZ Tray. Verifique o certificado cert.pem.",
  ) {
    super(message);
    this.name = "QzCertificateRejectedError";
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

export type QzTrustStatus = {
  ok: boolean;
  printersCount: number;
  prompted: boolean;
  reason?: "offline" | "untrusted" | "server_unconfigured";
};

type QzCertResponse = {
  cert: string;
  configured: boolean;
  subjectCN?: string;
  error?: string;
};

const CERT_CACHE_TTL_MS = 60_000;
let certCache: { at: number; value: QzCertResponse } | null = null;
let loadingPromise: Promise<QZ> | null = null;
let connectingPromise: Promise<QZ> | null = null;
let securityConfigured = false;
let lastCertProvidedAt = 0;
let lastSignDurationMs = 0;

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

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
        lastCertProvidedAt = nowMs();
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

export async function fetchQzCertificate(): Promise<QzCertResponse> {
  if (certCache && Date.now() - certCache.at < CERT_CACHE_TTL_MS) {
    return certCache.value;
  }
  const response = await fetch(QZ_API, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await parseQzApiResponse<QzCertResponse>(
    response,
    "Não foi possível obter o certificado do QZ Tray.",
  );
  if (data.configured && data.cert) {
    certCache = { at: Date.now(), value: data };
  }
  return data;
}

async function signQzPayload(request: string): Promise<{ signature: string; configured: boolean }> {
  // O endpoint de assinatura exige sessão autenticada — ele assina com a
  // chave privada do servidor, então não pode ficar aberto para qualquer
  // visitante. Pegamos o access_token do Supabase e mandamos como Bearer.
  const t0 = nowMs();
  try {
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
    return await parseQzApiResponse(response, "Não foi possível assinar a requisição do QZ Tray.");
  } finally {
    lastSignDurationMs += Math.max(0, Math.round(nowMs() - t0));
  }
}

async function parseQzApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
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
    connection?: { sendData?: unknown; readyState?: number } | null;
  };
  const active = wsAny.isActive();
  const conn = wsAny.connection;
  const stale =
    active &&
    (!conn ||
      typeof (conn as { sendData?: unknown }).sendData !== "function" ||
      (typeof conn.readyState === "number" && conn.readyState !== 1));

  if (active && !stale) {
    return qz;
  }
  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    if (stale) {
      try {
        await qz.websocket.disconnect();
      } catch {
        /* ignore */
      }
    }
    lastCertProvidedAt = 0;
    try {
      await qz.websocket.connect({ retries: 1, delay: 1 });
    } catch {
      if (lastCertProvidedAt > 0) {
        throw new QzCertificateRejectedError();
      }
      throw new QzNotRunningError();
    }
    return qz;
  })().finally(() => {
    connectingPromise = null;
  });

  return connectingPromise;
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
export async function checkQzStatusAndTrust(): Promise<QzTrustStatus> {
  const certInfo = await fetchQzCertificate().catch(() => null);
  if (!certInfo?.configured || !certInfo.cert) {
    return { ok: false, printersCount: 0, prompted: false, reason: "server_unconfigured" };
  }

  try {
    if (typeof window !== "undefined" && window.qz?.websocket?.isActive()) {
      try {
        await window.qz.websocket.disconnect();
      } catch {
        /* ignore */
      }
    }
    lastSignDurationMs = 0;
    const t0 = nowMs();
    await ensureQzConnected();
    const res = await listQzPrintersWithDefault();
    const elapsed = Math.round(nowMs() - t0);
    const localMs = Math.max(0, elapsed - lastSignDurationMs);
    const prompted = localMs > 2500;
    if (prompted) {
      return { ok: true, printersCount: res.printers.length, prompted: true, reason: "untrusted" };
    }
    return { ok: true, printersCount: res.printers.length, prompted: false };
  } catch (err) {
    if (err instanceof QzNotRunningError) {
      return { ok: false, printersCount: 0, prompted: false, reason: "offline" };
    }
    try {
      if (typeof window !== "undefined" && window.qz?.websocket?.isActive()) {
        await window.qz.websocket.disconnect();
      }
    } catch {
      /* ignore */
    }
    return { ok: false, printersCount: 0, prompted: true, reason: "untrusted" };
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
    const payload = (text.startsWith("\x1b@") ? "" : printerReset()) + text + "\n".repeat(feed) + cut;
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
  opts?: { feedLines?: number; cutType?: "none" | "partial" | "full"; copies?: number },
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

    const payload = (text.startsWith("\x1b@") ? "" : printerReset()) + text + "\n".repeat(feed) + cut;
    const copies = Math.max(1, Math.min(2, Math.trunc(opts?.copies ?? 1)));
    const config = qz.configs.create(target, { encoding: "CP860" });
    await withTimeout(
      qz.print(
        config,
        Array.from({ length: copies }, () => payload),
      ),
      copies > 1 ? 30_000 : 15_000,
      new QzPrintTimeoutError(),
    );
    return { printer: target };
  });
}

function withTimeout<T>(p: Promise<T>, ms: number, err: Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(err), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
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
export async function getQzPrinterStatus(printerName: string | undefined): Promise<QzPrinterStatus> {
  if (!printerName?.trim()) {
    return { ok: false, reason: "Nenhuma impressora configurada.", code: "UNCONFIGURED" };
  }
  return getQzPrinterStatusInternal(printerName.trim());
}

async function getQzPrinterStatusInternal(
  printerName: string | undefined,
): Promise<QzPrinterStatus> {
  const qz = await ensureQzConnected();
  let target = printerName?.trim();
  if (!target) {
    try {
      target = await qz.printers.getDefault();
    } catch {
      /* ignore */
    }
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
      try {
        await printersApi.startListening?.(target);
      } catch {
        /* ignore */
      }
      const raw = await withTimeout(printersApi.getStatus(), 3_000, new Error("status-timeout"));
      try {
        await printersApi.stopListening?.();
      } catch {
        /* ignore */
      }
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
        return {
          ok: false,
          reason: map[code] || `Impressora com erro (${code || "desconhecido"}).`,
          code,
        };
      }
    }
  } catch {
    /* status check é best-effort — segue sem falhar */
  }

  return { ok: true };
}

export async function checkQzPrinterReady(
  printerName: string | undefined,
): Promise<QzPrinterStatus> {
  const target = printerName?.trim();
  if (!target) {
    return { ok: false, reason: "Nenhuma impressora configurada.", code: "UNCONFIGURED" };
  }
  try {
    return await getQzPrinterStatus(target);
  } catch (err) {
    if (err instanceof QzNotRunningError) {
      return {
        ok: false,
        reason: "O QZ Tray está desligado neste computador.",
        code: "QZ_OFFLINE",
      };
    }
    if (err instanceof QzCertificateRejectedError) {
      return {
        ok: false,
        reason: err.message,
        code: "QZ_UNTRUSTED",
      };
    }
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Não foi possível conectar ao QZ Tray.",
      code: "QZ_ERROR",
    };
  }
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
 * Monta um instalador híbrido `.bat` + `.ps1` auto-extraível para Windows.
 *
 * Estratégia (v7):
 *   - Todas as linhas respeitam limite curto (`<= 120` chars), evitando o limite
 *     de 8.191 chars do `cmd.exe` que quebrava o antigo `-EncodedCommand`.
 *   - Solicita elevação UAC automaticamente caso não esteja como Administrador.
 *   - Exige estritamente o `cert.pem` baixado (pasta atual / Downloads / Desktop)
 *     e valida o Thumbprint SHA-1 contra o certificado ativo do servidor.
 *   - Encerra o QZ Tray (`preinstall` + `qz-tray`/`javaw.exe`) ANTES de gravar.
 *   - Remove arquivos legados (`allowed.pem`, `override.pem`, `allowed.txt`, `blocked.pem`).
 *   - Sobrescreve `cert.pem`, `override.crt`, `qz-tray.properties` (`authcert.override`)
 *     e atualiza `allowed.dat` / `blocked.dat` em Program Files, ProgramData e AppData.
 *   - Reinicia o QZ Tray na sessão do usuário e valida a porta local (8182/8181).
 */
export const QZ_INSTALLER_VERSION = 7;

function formatPem64(certPem: string): string {
  const b64 = certPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (!b64) return certPem.replace(/\r\n/g, "\n").trim();
  const chunks = b64.match(/.{1,64}/g) ?? [b64];
  return ["-----BEGIN CERTIFICATE-----", ...chunks, "-----END CERTIFICATE-----"].join("\n");
}

export function buildQzWindowsInstaller(certPem: string): string {
  const formattedPem = formatPem64(certPem);
  const psScript = QZ_INSTALL_PS1.replace("__EXPECTED_PEM__", formattedPem).trim();
  const batLines = [
    "@echo off",
    "setlocal EnableExtensions",
    "chcp 65001 >nul",
    `title Menuzin - Configurar QZ Tray (v${QZ_INSTALLER_VERSION})`,
    `echo Menuzin QZ Tray Setup - versao ${QZ_INSTALLER_VERSION}`,
    "echo.",
    'for %%I in ("%~dp0.") do set "ORIG_DIR=%%~fI"',
    'if not "%~1"=="" set "ORIG_DIR=%~1"',
    'if "%ORIG_DIR:~-1%"=="\\" set "ORIG_DIR=%ORIG_DIR:~0,-1%"',
    'set "ORIG_USER=%USERNAME%"',
    'if not "%~2"=="" set "ORIG_USER=%~2"',
    "net session >nul 2>&1",
    "if errorlevel 1 (",
    "  echo Solicitando permissao de Administrador...",
    '  set "MZ_SELF=%~f0"',
    "  powershell -NoProfile -ExecutionPolicy Bypass -Command ^",
    '    "$q=[char]34;$a=($q+$env:ORIG_DIR+$q),($q+$env:ORIG_USER+$q);" ^',
    '    "Start-Process $env:MZ_SELF -ArgumentList $a -Verb RunAs" ^',
    "    >nul 2>&1",
    "  if errorlevel 1 (",
    "    echo.",
    "    echo Este instalador precisa ser executado como Administrador.",
    "    echo Clique com o botao direito no arquivo e escolha:",
    '    echo "Executar como administrador".',
    "    echo.",
    "    pause",
    "    exit /b 1",
    "  )",
    "  exit /b 0",
    ")",
    'set "MZ_SRC=%~f0"',
    'set "MZ_DST=%TEMP%\\mz-qz-%RANDOM%.ps1"',
    "powershell -NoProfile -ExecutionPolicy Bypass -Command ^",
    '  "$s=[IO.File]::ReadAllText($env:MZ_SRC,[Text.Encoding]::UTF8);" ^',
    `  "$m='# === MENUZIN_PS1_'+'START ===';" ^`,
    '  "$i=$s.LastIndexOf($m);if($i -lt 0){exit 2};" ^',
    '  "$u=New-Object Text.UTF8Encoding($false);" ^',
    '  "[IO.File]::WriteAllText($env:MZ_DST,$s.Substring($i+$m.Length),$u)"',
    "if errorlevel 1 (",
    "  echo Falha ao extrair script de configuracao.",
    "  pause",
    "  exit /b 2",
    ")",
    'powershell -NoProfile -ExecutionPolicy Bypass -File "%MZ_DST%" ^',
    '  -BatDir "%ORIG_DIR%" -OrigUser "%ORIG_USER%"',
    'set "ERR=%ERRORLEVEL%"',
    'del /f /q "%MZ_DST%" >nul 2>&1',
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
    "# === MENUZIN_PS1_START ===",
    ...psScript.split(/\r?\n/),
    "",
  ];
  return batLines.join("\r\n");
}

const QZ_INSTALL_PS1 = `
param([string]$BatDir, [string]$OrigUser)
$ErrorActionPreference = 'Stop'
try {
  Write-Host "Menuzin QZ installer - PowerShell stage (v7)"
  if ($BatDir -and $BatDir -match '^[A-Za-z]:$') { $BatDir = "$BatDir\\" }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $x509Cls = 'System.Security.Cryptography.X509Certificates.X509Certificate2'
  $sCmp = [StringComparison]::OrdinalIgnoreCase

  $expectedPem = @'
__EXPECTED_PEM__
'@
  $expBytes = [Text.Encoding]::UTF8.GetBytes($expectedPem.Trim())
  $expCert = New-Object $x509Cls (,$expBytes)
  $expectedThumb = $expCert.Thumbprint.ToLowerInvariant()
  Write-Host ("Fingerprint esperado: " + $expectedThumb)

  $searchDirs = New-Object System.Collections.Generic.List[string]
  function Add-SearchDir([string]$d) {
    if ($d -and (Test-Path -LiteralPath $d)) {
      if (-not $searchDirs.Contains($d)) { [void]$searchDirs.Add($d) }
    }
  }
  Add-SearchDir $BatDir
  if ($OrigUser) {
    $ouPath = Join-Path "$env:SystemDrive\\Users" $OrigUser
    Add-SearchDir (Join-Path $ouPath 'Downloads')
    Add-SearchDir (Join-Path $ouPath 'Desktop')
  }
  if ($env:USERPROFILE) {
    Add-SearchDir (Join-Path $env:USERPROFILE 'Downloads')
    Add-SearchDir (Join-Path $env:USERPROFILE 'Desktop')
  }
  $usersRoot = Join-Path $env:SystemDrive 'Users'
  $sysNames = @('Public', 'Default', 'Default User', 'All Users')
  if (Test-Path -LiteralPath $usersRoot) {
    Get-ChildItem -LiteralPath $usersRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $sysNames -notcontains $_.Name } |
      ForEach-Object { Add-SearchDir (Join-Path $_.FullName 'Downloads') }
  }

  $candidates = New-Object System.Collections.Generic.List[IO.FileInfo]
  $seenFiles = New-Object System.Collections.Generic.HashSet[string]
  if ($BatDir) {
    $direct = Join-Path $BatDir 'cert.pem'
    if (Test-Path -LiteralPath $direct) {
      $fi = Get-Item -LiteralPath $direct
      [void]$seenFiles.Add($fi.FullName.ToLowerInvariant())
      [void]$candidates.Add($fi)
    }
  }
  foreach ($sd in $searchDirs) {
    $hits = Get-ChildItem -LiteralPath $sd -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like 'cert*.pem' -or $_.Name -like 'qz-cert*.crt' } |
      Sort-Object LastWriteTime -Descending
    foreach ($h in $hits) {
      if ($seenFiles.Add($h.FullName.ToLowerInvariant())) { [void]$candidates.Add($h) }
    }
  }

  $validCert = $null
  $validPem = $null
  $validPath = $null
  $foundMismatch = $null
  $pemRx = '(?s)-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----'

  foreach ($cand in $candidates) {
    try {
      $raw = [IO.File]::ReadAllText($cand.FullName)
      $m = [regex]::Match($raw, $pemRx)
      if (-not $m.Success) { continue }
      $block = ($m.Value -replace "\\r\\n", "\`n").Trim() + "\`n"
      $cBytes = [Text.Encoding]::UTF8.GetBytes($block)
      $cObj = New-Object $x509Cls (,$cBytes)
      $thumb = $cObj.Thumbprint.ToLowerInvariant()
      if ($thumb -eq $expectedThumb) {
        $validCert = $cObj
        $validPem = $block
        $validPath = $cand.FullName
        break
      } elseif (-not $foundMismatch) {
        $foundMismatch = $cand.FullName
      }
    } catch {}
  }

  if (-not $validCert) {
    Write-Host ''
    if ($foundMismatch) {
      Write-Host ('[ERRO] O arquivo encontrado (' + $foundMismatch + ') esta desatualizado.')
      Write-Host '1. Volte na tela do Menuzin (Passo 2).'
      Write-Host '2. Baixe novamente o cert.pem pelo botao laranja "Baixar cert.pem".'
      Write-Host '3. Execute este auto-configurador novamente.'
      exit 4
    }
    Write-Host '[ERRO] O arquivo obrigatorio "cert.pem" nao foi encontrado na pasta atual nem em Downloads!'
    Write-Host '1. Volte na tela do Menuzin (Passo 2).'
    Write-Host '2. Clique no botao laranja "Baixar cert.pem".'
    Write-Host '3. Execute este auto-configurador novamente.'
    exit 3
  }

  Write-Host ("Certificado cert.pem validado: " + $validPath)
  if ($BatDir -and (Test-Path -LiteralPath $BatDir)) {
    $batCert = Join-Path $BatDir 'cert.pem'
    if (-not $validPath.Equals($batCert, $sCmp)) {
      [IO.File]::WriteAllText($batCert, $validPem, $utf8NoBom)
    }
  }

  $installCandidates = New-Object System.Collections.Generic.List[string]
  $pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
  $pfRoots = @(
    $env:ProgramW6432,
    $env:ProgramFiles,
    $pf86,
    "$env:SystemDrive\\Program Files",
    "$env:SystemDrive\\Program Files (x86)",
    "$env:LOCALAPPDATA\\Programs"
  )
  foreach ($r in $pfRoots) {
    if ($r) { [void]$installCandidates.Add((Join-Path $r 'QZ Tray')) }
  }
  if ($OrigUser) {
    [void]$installCandidates.Add("$env:SystemDrive\\Users\\$OrigUser\\AppData\\Local\\Programs\\QZ Tray")
  }
  if (Test-Path -LiteralPath $usersRoot) {
    Get-ChildItem -LiteralPath $usersRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $sysNames -notcontains $_.Name } |
      ForEach-Object {
        [void]$installCandidates.Add((Join-Path $_.FullName 'AppData\\Local\\Programs\\QZ Tray'))
      }
  }
  try {
    $regKeys = @(
      'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )
    Get-ItemProperty $regKeys -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -like 'QZ Tray*' -and $_.InstallLocation } |
      ForEach-Object { [void]$installCandidates.Add($_.InstallLocation.TrimEnd('\\')) }
  } catch {}

  $installDirs = New-Object System.Collections.Generic.List[string]
  $seenDirs = New-Object System.Collections.Generic.HashSet[string]
  foreach ($d in $installCandidates) {
    if (-not $d -or -not (Test-Path -LiteralPath $d)) { continue }
    $hasBin = (Test-Path -LiteralPath (Join-Path $d 'qz-tray.exe')) -or
              (Test-Path -LiteralPath (Join-Path $d 'QZ Tray.exe')) -or
              (Test-Path -LiteralPath (Join-Path $d 'qz-tray.jar'))
    if ($hasBin -and $seenDirs.Add($d.ToLowerInvariant())) {
      [void]$installDirs.Add($d)
    }
  }
  if ($installDirs.Count -eq 0) {
    Write-Host ''
    Write-Host '[ERRO] QZ Tray nao encontrado neste computador.'
    Write-Host '1. Instale o QZ Tray pelo link do Passo 1 (qz.io/download).'
    Write-Host '2. Execute este auto-configurador novamente.'
    exit 5
  }
  $installDir = $installDirs[0]
  Write-Host ("QZ Tray encontrado em: " + $installDir)

  foreach ($d in $installDirs) {
    $j = Join-Path $d 'runtime\\bin\\java.exe'
    $jar = Join-Path $d 'qz-tray.jar'
    if ((Test-Path -LiteralPath $j) -and (Test-Path -LiteralPath $jar)) {
      try { & $j -jar $jar preinstall 2>$null | Out-Null } catch {}
    }
  }
  $pNames = @('qz-tray', 'QZ Tray', 'qz-tray-console')
  Get-Process -Name $pNames -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue
  try {
    $f = "Name='javaw.exe' OR Name='java.exe'"
    $jProcs = Get-CimInstance Win32_Process -Filter $f -ErrorAction SilentlyContinue
    if (-not $jProcs) {
      $jProcs = Get-WmiObject Win32_Process -Filter $f -ErrorAction SilentlyContinue
    }
    foreach ($jp in $jProcs) {
      $cmd = [string]$jp.CommandLine
      $exePath = [string]$jp.ExecutablePath
      $isQz = ($cmd -like '*qz-tray*')
      foreach ($d in $installDirs) {
        if ($exePath -and $exePath.StartsWith($d, $sCmp)) { $isQz = $true }
      }
      if ($isQz) {
        Stop-Process -Id $jp.ProcessId -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {}
  Start-Sleep -Milliseconds 1500

  $pdBase = if ($env:ProgramData) { $env:ProgramData } else { "$env:SystemDrive\\ProgramData" }
  $progDataQz = Join-Path $pdBase 'qz'
  New-Item -ItemType Directory -Path $progDataQz -Force | Out-Null

  $userQzDirs = New-Object System.Collections.Generic.List[string]
  $seenUserQz = New-Object System.Collections.Generic.HashSet[string]
  if (Test-Path -LiteralPath $usersRoot) {
    Get-ChildItem -LiteralPath $usersRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $sysNames -notcontains $_.Name } |
      ForEach-Object {
        $roam = Join-Path $_.FullName 'AppData\\Roaming'
        if (Test-Path -LiteralPath $roam) {
          $uqz = Join-Path $roam 'qz'
          if ($seenUserQz.Add($uqz.ToLowerInvariant())) {
            New-Item -ItemType Directory -Path $uqz -Force | Out-Null
            [void]$userQzDirs.Add($uqz)
          }
        }
      }
  }
  if ($env:APPDATA) {
    $curQz = Join-Path $env:APPDATA 'qz'
    if ($seenUserQz.Add($curQz.ToLowerInvariant())) {
      New-Item -ItemType Directory -Path $curQz -Force | Out-Null
      [void]$userQzDirs.Add($curQz)
    }
  }

  $allTargets = New-Object System.Collections.Generic.List[string]
  foreach ($d in $installDirs) { [void]$allTargets.Add($d) }
  [void]$allTargets.Add($progDataQz)
  foreach ($u in $userQzDirs) { [void]$allTargets.Add($u) }

  $legacyNames = @('allowed.pem', 'override.pem', 'allowed.txt', 'blocked.pem')
  foreach ($dir in $allTargets) {
    foreach ($sub in @('', 'override', 'data\\certificates')) {
      $folder = if ($sub) { Join-Path $dir $sub } else { $dir }
      foreach ($ln in $legacyNames) {
        $lp = Join-Path $folder $ln
        if (Test-Path -LiteralPath $lp) {
          Remove-Item -LiteralPath $lp -Force -ErrorAction SilentlyContinue
        }
      }
    }
    [IO.File]::WriteAllText((Join-Path $dir 'cert.pem'), $validPem, $utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $dir 'override.crt'), $validPem, $utf8NoBom)
  }

  $canonCertPath = (Join-Path $progDataQz 'cert.pem').Replace('\\', '/')
  function Update-QzProperties([string]$propPath) {
    $parent = Split-Path -Parent $propPath
    if (-not (Test-Path -LiteralPath $parent)) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $kept = New-Object System.Collections.Generic.List[string]
    if (Test-Path -LiteralPath $propPath) {
      foreach ($line in [IO.File]::ReadAllLines($propPath)) {
        if ($line -match '^\\s*(authcert\\.override|trustedRootCert|tray\\.strictmode)\\s*=') {
          continue
        }
        [void]$kept.Add($line)
      }
    }
    [void]$kept.Add("authcert.override=$canonCertPath")
    $outText = ($kept -join "\`n") + "\`n"
    [IO.File]::WriteAllText($propPath, $outText, $utf8NoBom)
  }
  foreach ($dir in $allTargets) {
    Update-QzProperties (Join-Path $dir 'qz-tray.properties')
  }

  $primaryJava = Join-Path $installDir 'runtime\\bin\\java.exe'
  $primaryJar = Join-Path $installDir 'qz-tray.jar'
  $globalCertFile = Join-Path $progDataQz 'cert.pem'
  if ((Test-Path -LiteralPath $primaryJava) -and (Test-Path -LiteralPath $primaryJar)) {
    try { & $primaryJava -jar $primaryJar --allow $globalCertFile 2>$null | Out-Null } catch {}
  }

  $nameType = [System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName
  $cn = $validCert.GetNameInfo($nameType, $false)
  if (-not $cn) { $cn = 'Menuzin' }
  $org = $cn
  if ($validCert.Subject -match '(?:^|,\\s*)O=([^,]+)') {
    $org = $matches[1].Trim().Trim('"')
  }
  $vFrom = $validCert.NotBefore.ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss')
  $vTo = $validCert.NotAfter.ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss')
  $tab = [char]9
  $datLine = @($expectedThumb, $cn, $org, $vFrom, $vTo, 'true') -join $tab

  $datDirs = New-Object System.Collections.Generic.List[string]
  [void]$datDirs.Add($progDataQz)
  foreach ($u in $userQzDirs) { [void]$datDirs.Add($u) }

  foreach ($dd in $datDirs) {
    $aDat = Join-Path $dd 'allowed.dat'
    $aLines = New-Object System.Collections.Generic.List[string]
    if (Test-Path -LiteralPath $aDat) {
      foreach ($rawL in [IO.File]::ReadAllLines($aDat)) {
        if ([string]::IsNullOrWhiteSpace($rawL)) { continue }
        $firstCol = ($rawL -split $tab)[0].Trim().ToLowerInvariant()
        if ($firstCol -eq $expectedThumb) { continue }
        [void]$aLines.Add($rawL)
      }
    }
    [void]$aLines.Add($datLine)
    $aText = ($aLines -join "\`n") + "\`n"
    [IO.File]::WriteAllText($aDat, $aText, $utf8NoBom)

    $bDat = Join-Path $dd 'blocked.dat'
    if (Test-Path -LiteralPath $bDat) {
      $bLines = New-Object System.Collections.Generic.List[string]
      foreach ($rawB in [IO.File]::ReadAllLines($bDat)) {
        if ([string]::IsNullOrWhiteSpace($rawB)) { continue }
        $bLow = $rawB.ToLowerInvariant()
        if ($bLow.Contains($expectedThumb) -or $rawB.Contains("$tab$cn$tab")) { continue }
        [void]$bLines.Add($rawB)
      }
      $bText = if ($bLines.Count -gt 0) { ($bLines -join "\`n") + "\`n" } else { '' }
      [IO.File]::WriteAllText($bDat, $bText, $utf8NoBom)
    }
  }

  $qzExe = $null
  foreach ($n in @('qz-tray.exe', 'QZ Tray.exe')) {
    $candExe = Join-Path $installDir $n
    if ((-not $qzExe) -and (Test-Path -LiteralPath $candExe)) { $qzExe = $candExe }
  }
  if ($qzExe) {
    $argQ = [char]34 + $qzExe + [char]34
    try { Start-Process -FilePath 'explorer.exe' -ArgumentList $argQ } catch {}
    Start-Sleep -Milliseconds 2000
    $running = Get-Process -Name 'qz-tray', 'QZ Tray' -ErrorAction SilentlyContinue
    if (-not $running) {
      if ((Test-Path -LiteralPath $primaryJava) -and (Test-Path -LiteralPath $primaryJar)) {
        try { & $primaryJava -jar $primaryJar spawn $qzExe 2>$null | Out-Null } catch {}
      }
      Start-Sleep -Milliseconds 1500
      $running = Get-Process -Name 'qz-tray', 'QZ Tray' -ErrorAction SilentlyContinue
      if (-not $running) {
        try { Start-Process -FilePath $qzExe -WorkingDirectory $installDir } catch {}
      }
    }
  }

  $listeningPort = $null
  for ($i = 0; $i -lt 20; $i++) {
    foreach ($p in @(8182, 8181)) {
      $tcp = New-Object System.Net.Sockets.TcpClient
      try {
        $ar = $tcp.BeginConnect('127.0.0.1', $p, $null, $null)
        if ($ar.AsyncWaitHandle.WaitOne(200, $false) -and $tcp.Connected) {
          $tcp.EndConnect($ar)
          $listeningPort = $p
          break
        }
      } catch {} finally {
        $tcp.Dispose()
      }
    }
    if ($listeningPort) { break }
    Start-Sleep -Milliseconds 500
  }
  if ($listeningPort) {
    Write-Host ("QZ Tray ativo e ouvindo na porta " + $listeningPort)
  } else {
    Write-Host 'QZ Tray reiniciado. Aguarde alguns segundos e clique em Testar de novo.'
  }
  exit 0
} catch {
  Write-Host ('Erro: ' + $_.Exception.Message)
  exit 1
}
`;

/** Baixa o instalador .bat (Windows) com validação de cert.pem. */
export async function downloadQzWindowsInstaller(): Promise<void> {
  const { cert, configured } = await fetchQzCertificate();
  if (!configured || !cert) {
    throw new Error(
      "O certificado do QZ Tray ainda não foi configurado no servidor. Contate o administrador.",
    );
  }
  const bat = buildQzWindowsInstaller(cert);
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
