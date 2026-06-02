import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, Copy, ShieldCheck, ShieldAlert, Plug,
} from "lucide-react";
import { toast } from "sonner";
import { fetchQzCertificate, type QzPrinter } from "@/lib/qz-tray";

export type QzConnectionAttempt = {
  at: Date;
  ok: boolean;
  error?: string;
  durationMs?: number;
  action?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedPrinter: string;
  defaultPrinter: string | null;
  qzPrinters: QzPrinter[];
  qzStatus: "unknown" | "connected" | "offline";
  lastAttempt: QzConnectionAttempt | null;
  onRetryDetect: () => void | Promise<void>;
  retrying: boolean;
};

type CertInfo = {
  loading: boolean;
  configured: boolean;
  error?: string;
  fingerprintSha256?: string;
  notAfter?: string;
  subjectCN?: string;
  pemPreview?: string;
};

const CERT_PATHS = [
  "%PROGRAMDATA%\\qz\\data\\certificates\\allowed.pem (Windows, system-wide)",
  "%APPDATA%\\qz\\data\\certificates\\allowed.pem (Windows, per-user)",
  "/Library/Application Support/qz/data/certificates/allowed.pem (macOS, system-wide)",
  "~/Library/Application Support/qz/data/certificates/allowed.pem (macOS, per-user)",
  "/etc/qz/data/certificates/allowed.pem (Linux, system-wide)",
  "~/.qz/data/certificates/allowed.pem (Linux, per-user)",
];

export function QzDiagnosticsModal({
  open, onOpenChange, selectedPrinter, defaultPrinter, qzPrinters,
  qzStatus, lastAttempt, onRetryDetect, retrying,
}: Props) {
  const [cert, setCert] = useState<CertInfo>({ loading: false, configured: false });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setCert((c) => ({ ...c, loading: true, error: undefined }));
      try {
        const { cert: pem, configured, subjectCN, error } = await fetchQzCertificate();
        if (cancelled) return;
        if (!configured || !pem) {
          setCert({ loading: false, configured: false, error, subjectCN });
          return;
        }
        const info = await analyzeCertificate(pem);
        setCert({
          loading: false,
          configured: true,
          ...info,
          subjectCN: subjectCN || info.subjectCN,
        });
      } catch (e) {
        if (cancelled) return;
        setCert({
          loading: false,
          configured: false,
          error: (e as Error).message || "Falha ao obter certificado",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const isDemoCert =
    !!cert.subjectCN && /QZ Industries/i.test(cert.subjectCN);
  const isServerDemoError = !cert.configured && !!cert.error && /demonstra/i.test(cert.error);

  const copy = (label: string, value: string) => {
    void navigator.clipboard?.writeText(value).then(
      () => toast.success(`${label} copiado.`),
      () => toast.error("Não foi possível copiar."),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Diagnóstico do QZ Tray</DialogTitle>
          <DialogDescription>
            Use estas informações para identificar problemas de conexão ou de assinatura do certificado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status conexão */}
          <Section title="Conexão">
            <Row label="Status">
              {qzStatus === "connected" ? (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Conectado
                </Badge>
              ) : qzStatus === "offline" ? (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3.5 w-3.5" /> Offline
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Plug className="mr-1 h-3.5 w-3.5" /> Não verificado
                </Badge>
              )}
            </Row>
            <Row label="Última tentativa">
              {lastAttempt ? (
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    {lastAttempt.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{lastAttempt.ok ? "Sucesso" : "Falha"}</span>
                    {typeof lastAttempt.durationMs === "number" && (
                      <span className="text-muted-foreground">· {lastAttempt.durationMs} ms</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lastAttempt.action ? `${lastAttempt.action} · ` : ""}
                    {lastAttempt.at.toLocaleString()}
                  </div>
                  {lastAttempt.error && (
                    <div className="mt-1 rounded bg-destructive/10 p-2 text-xs text-destructive">
                      {lastAttempt.error}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Nenhuma tentativa registrada nesta sessão.</span>
              )}
            </Row>
          </Section>

          {/* Impressora */}
          <Section title="Impressora">
            <Row label="Selecionada">
              <span className="text-sm">
                {selectedPrinter ? (
                  <code className="rounded bg-muted px-1.5 py-0.5">{selectedPrinter}</code>
                ) : (
                  <span className="text-muted-foreground">Nenhuma — usará a padrão do sistema.</span>
                )}
              </span>
            </Row>
            <Row label="Padrão do sistema">
              <span className="text-sm">
                {defaultPrinter ? (
                  <code className="rounded bg-muted px-1.5 py-0.5">{defaultPrinter}</code>
                ) : (
                  <span className="text-muted-foreground">Desconhecida</span>
                )}
              </span>
            </Row>
            <Row label="Detectadas">
              <span className="text-sm">
                {qzPrinters.length > 0
                  ? `${qzPrinters.length} impressora(s)`
                  : <span className="text-muted-foreground">Nenhuma detectada</span>}
              </span>
            </Row>
          </Section>

          {/* Certificado */}
          <Section title="Certificado (cert.pem)">
            {(isDemoCert || isServerDemoError) && (
              <div className="mb-2 flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-2.5 text-xs text-destructive">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Certificado de demonstração detectado.</div>
                  <p className="mt-0.5">
                    O segredo do servidor está usando o cert demo do QZ Tray (CN = QZ Industries).
                    Esse cert é hard-coded como <em>untrusted</em> pelo QZ Tray — o prompt
                    "Action Required" vai aparecer em toda conexão, mesmo com instalador.
                    Gere um cert próprio e atualize <code>QZ_CERT_PEM</code>/<code>QZ_PRIVATE_KEY_PEM</code>.
                  </p>
                </div>
              </div>
            )}
            <Row label="Servidor">
              {cert.loading ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando…
                </span>
              ) : cert.configured ? (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Configurado
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <ShieldAlert className="mr-1 h-3.5 w-3.5" /> {cert.error ? "Erro" : "Não configurado"}
                </Badge>
              )}
            </Row>
            {cert.subjectCN && (
              <Row label="Assunto (CN)">
                <code className="text-xs">{cert.subjectCN}</code>
              </Row>
            )}
            {cert.notAfter && (
              <Row label="Validade">
                <span className="text-sm">{cert.notAfter}</span>
              </Row>
            )}
            {cert.fingerprintSha256 && (
              <Row label="SHA-256">
                <div className="flex items-center gap-2">
                  <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px] leading-5">
                    {cert.fingerprintSha256}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => copy("Fingerprint", cert.fingerprintSha256!)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Row>
            )}
            {cert.error && (
              <p className="text-xs text-destructive">{cert.error}</p>
            )}

            <div className="mt-2">
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Caminhos esperados do <code>cert.pem</code> no cliente
              </div>
              <ul className="space-y-1">
                {CERT_PATHS.map((p) => (
                  <li key={p} className="flex items-center justify-between gap-2 rounded border bg-muted/40 px-2 py-1">
                    <code className="truncate text-[11px]">{p}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => copy("Caminho", p)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onRetryDetect()} disabled={retrying}>
            {retrying ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Tentar conectar novamente
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-2">
      <div className="pt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

async function analyzeCertificate(pem: string): Promise<Partial<CertInfo>> {
  const out: Partial<CertInfo> = {
    pemPreview: pem.split("\n").slice(0, 2).join("\n"),
  };
  try {
    const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const der = base64ToBytes(b64);
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const hash = await crypto.subtle.digest("SHA-256", der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer);
      out.fingerprintSha256 = bytesToHex(new Uint8Array(hash)).match(/.{2}/g)!.join(":").toUpperCase();
    }
    const ascii = Array.from(der, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : " ")).join("");
    const cnMatch = ascii.match(/CN[^A-Za-z0-9]{1,4}([A-Za-z0-9 .\-_*]{3,80})/);
    if (cnMatch) out.subjectCN = cnMatch[1].trim();
    const dateMatch = ascii.match(/(\d{12,14})Z[\s\S]{0,8}(\d{12,14})Z/);
    if (dateMatch) {
      const raw = dateMatch[2];
      const yy = raw.length === 12 ? `20${raw.slice(0, 2)}` : raw.slice(0, 4);
      const rest = raw.length === 12 ? raw.slice(2) : raw.slice(4);
      const mm = rest.slice(0, 2), dd = rest.slice(2, 4), hh = rest.slice(4, 6), mi = rest.slice(6, 8);
      out.notAfter = `${dd}/${mm}/${yy} ${hh}:${mi} UTC`;
    }
  } catch {
    /* best-effort parsing */
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}
