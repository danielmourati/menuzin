// Integração leve com QZ Tray (https://qz.io/) carregada sob demanda via CDN.
// Não exigimos dependência npm; o usuário precisa ter o aplicativo QZ Tray
// instalado e em execução localmente para que a conexão funcione.

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
    setCertificatePromise: (fn: (resolve: (v: string) => void) => void) => void;
    setSignaturePromise: (fn: (hash: string) => (resolve: (v: string) => void) => void) => void;
  };
};

declare global {
  interface Window {
    qz?: QZ;
  }
}

const QZ_CDN = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";

let loadingPromise: Promise<QZ> | null = null;

function loadQzScript(): Promise<QZ> {
  if (typeof window === "undefined") return Promise.reject(new Error("Sem ambiente de navegador"));
  if (window.qz) return Promise.resolve(window.qz);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<QZ>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-qz-tray="1"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.qz) resolve(window.qz);
        else reject(new Error("Falha ao carregar QZ Tray"));
      });
      existing.addEventListener("error", () => reject(new Error("Falha ao baixar QZ Tray")));
      return;
    }
    const s = document.createElement("script");
    s.src = QZ_CDN;
    s.async = true;
    s.dataset.qzTray = "1";
    s.onload = () => {
      if (window.qz) {
        // Modo "unsigned" (sem assinatura). Funciona se o usuário aceitar o prompt do QZ Tray.
        try {
          window.qz.security.setCertificatePromise((resolve) => resolve(""));
          window.qz.security.setSignaturePromise(() => (resolve) => resolve(""));
        } catch {
          /* ignore */
        }
        resolve(window.qz);
      } else {
        reject(new Error("QZ Tray não inicializou"));
      }
    };
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
      throw new Error(
        "QZ Tray não encontrado. Verifique se o aplicativo está instalado e aberto.",
      );
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
