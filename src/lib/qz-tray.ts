// Integração com QZ Tray (https://qz.io/) carregada sob demanda via CDN.
// Em vez do modo "unsigned" (que dispara prompt de aceite a cada chamada),
// usamos um par cert.pem + chave privada próprios: o cert é declarado como
// `authcert.override=cert.pem` no QZ Tray do cliente, e a assinatura é feita
// no servidor (server function) com a chave privada correspondente.

import { getQzCertificate, signQzRequest } from "@/lib/qz-sign.functions";

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

declare global {
  interface Window {
    qz?: QZ;
  }
}

const QZ_CDN = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";

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
    getQzCertificate()
      .then(({ cert }) => resolve(cert ?? ""))
      .catch(reject);
  });
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    signQzRequest({ data: { request: toSign } })
      .then(({ signature }) => resolve(signature ?? ""))
      .catch(reject);
  });
  securityConfigured = true;
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
  const { cert, configured } = await getQzCertificate();
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
 * Monta o conteúdo de um instalador .bat para Windows que:
 *  - detecta a pasta de instalação do QZ Tray
 *  - escreve cert.pem dentro dela (a partir do conteúdo embutido)
 *  - adiciona/atualiza a linha authcert.override=cert.pem em qz-tray.properties
 *  - reinicia o QZ Tray
 * O usuário só precisa rodar como Administrador (clique direito → "Executar como administrador").
 */
export function buildQzWindowsInstaller(certPem: string): string {
  // Embute o cert.pem como base64 (single-line) — cmd não passa multi-line para o powershell.
  const certB64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(certPem.replace(/\r\n/g, "\n").trim() + "\n")))
      : Buffer.from(certPem.replace(/\r\n/g, "\n").trim() + "\n", "utf-8").toString("base64");
  return [
    "@echo off",
    "setlocal EnableExtensions EnableDelayedExpansion",
    "chcp 65001 >nul",
    "title Menuzin - Configurar QZ Tray",
    "",
    ":: Detecta a pasta de instalacao do QZ Tray",
    'set "QZ_DIR=%ProgramFiles%\\QZ Tray"',
    'if not exist "%QZ_DIR%\\qz-tray.properties" set "QZ_DIR=%ProgramFiles(x86)%\\QZ Tray"',
    'if not exist "%QZ_DIR%\\qz-tray.properties" (',
    "  echo.",
    "  echo QZ Tray nao foi encontrado.",
    "  echo Instale primeiro em https://qz.io/download/ e rode este arquivo novamente.",
    "  echo.",
    "  pause",
    "  exit /b 1",
    ")",
    "",
    ":: Verifica privilegios de administrador",
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
    'echo Configurando QZ Tray em "%QZ_DIR%"...',
    "",
    `set "CERT_B64=${certB64}"`,
    "",
    ":: Escreve cert.pem (conteudo embutido em base64)",
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "[IO.File]::WriteAllBytes((Join-Path $env:QZ_DIR \'cert.pem\'), [Convert]::FromBase64String($env:CERT_B64))"',
    "if errorlevel 1 (",
    "  echo Falha ao escrever cert.pem.",
    "  pause",
    "  exit /b 1",
    ")",
    "",
    ":: Garante a linha authcert.override=cert.pem em qz-tray.properties",
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Join-Path $env:QZ_DIR \'qz-tray.properties\'; $lines = if (Test-Path $p) { Get-Content $p } else { @() }; $lines = $lines | Where-Object { $_ -notmatch \'^\\s*authcert\\.override\\s*=\' }; $lines += \'authcert.override=cert.pem\'; Set-Content -LiteralPath $p -Value $lines -Encoding ascii"',
    "if errorlevel 1 (",
    "  echo Falha ao atualizar qz-tray.properties.",
    "  pause",
    "  exit /b 1",
    ")",
    "",
    ":: Reinicia o QZ Tray",
    'taskkill /IM "QZ Tray.exe" /F >nul 2>&1',
    'start "" "%QZ_DIR%\\QZ Tray.exe"',
    "",
    "echo.",
    "echo Configuracao concluida com sucesso.",
    "echo Volte ao Menuzin e clique em Detectar.",
    "echo.",
    "pause",
    "endlocal",
    "",
  ].join("\r\n");
}

/** Baixa o instalador .bat (Windows) com o cert.pem embutido. */
export async function downloadQzWindowsInstaller(): Promise<void> {
  const { cert, configured } = await getQzCertificate();
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
