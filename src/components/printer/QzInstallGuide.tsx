import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Download, ExternalLink, FileText, RefreshCw, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  downloadQzCertificate, downloadQzProperties, downloadQzWindowsInstaller,
} from "@/lib/qz-tray";

interface QzInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Função para tentar reconectar — geralmente o mesmo handler de "Detectar". */
  onRetry?: () => void | Promise<void>;
  retrying?: boolean;
}

export function QzInstallGuide({ open, onOpenChange, onRetry, retrying }: QzInstallGuideProps) {
  const [installing, setInstalling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadInstaller = async () => {
    setInstalling(true);
    try {
      await downloadQzWindowsInstaller();
      toast.success("Instalador baixado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setInstalling(false);
    }
  };

  const handleDownloadCert = async () => {
    setDownloading(true);
    try {
      await downloadQzCertificate();
      toast.success("cert.pem baixado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar QZ Tray em 4 passos</DialogTitle>
          <DialogDescription>
            Depois de concluir os 4 passos, a impressão acontece direto, sem pop-up de
            autorização a cada cupom.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">1</span>
            <div className="flex-1">
              <div className="font-medium">Instale o QZ Tray</div>
              <Button asChild size="sm" variant="outline" className="mt-1.5">
                <a href="https://qz.io/download/" target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> qz.io/download
                </a>
              </Button>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">2</span>
            <div className="flex-1">
              <div className="font-medium">Baixe o instalador da Menuzin (Windows)</div>
              <Button size="sm" onClick={handleDownloadInstaller} disabled={installing} className="mt-1.5">
                {installing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                menuzin-qz-setup.bat
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Clique direito → <strong>Executar como administrador</strong>. Se aparecer o
                SmartScreen azul, clique em <em>Mais informações → Executar assim mesmo</em>.
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">3</span>
            <div className="flex-1">
              <div className="font-medium">Volte aqui e clique em <em>Detectar</em></div>
              <p className="mt-1 text-xs text-muted-foreground">
                Se o status ficar verde sem pop-up, está pronto. Se ainda aparecer prompt,
                siga o passo 4.
              </p>
            </div>
          </li>

          <li className="flex gap-3 rounded-lg border-2 border-primary/50 bg-primary/5 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              4
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" /> Etapa obrigatória — confiar no certificado
              </div>
              <p className="mt-1.5 text-xs text-foreground">
                Acesse a rota abaixo no navegador desta máquina, instale/confie no
                certificado, e <strong>atualize esta página (F5)</strong>. Isso elimina o
                pop-up de autorização que aparece a cada impressão.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href="/api/public/qz-cert.crt"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-between gap-2 rounded-md border-2 border-primary bg-background px-3 py-2 text-xs font-mono font-semibold text-primary hover:bg-primary/10"
                >
                  <span>/api/public/qz-cert.crt</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Sem este passo, o navegador continuará pedindo permissão toda vez que
                  você imprimir um cupom.
                </span>
              </div>
            </div>
          </li>
        </ol>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            Ainda aparece o prompt? Configurar Site Manager manualmente
          </summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-foreground">
            <li>
              No ícone do QZ Tray (bandeja) → <strong>Advanced → Site Manager</strong>.
            </li>
            <li>
              Aba <strong>Allowed</strong> → <em>Add</em> → cole a URL deste painel.
            </li>
            <li>
              Aba <strong>Blocked</strong> → remova este domínio se estiver lá.
            </li>
            <li>
              Aba <strong>Trusted</strong> → <em>Add</em> → aponte para o arquivo baixado
              de <code className="rounded bg-muted px-1">/api/public/qz-cert.crt</code>.
            </li>
            <li>
              Quando o prompt aparecer, marque <strong>“Remember this decision”</strong> e
              clique em <em>Allow</em>.
            </li>
          </ol>
        </details>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            Instalação manual (macOS, Linux ou avançado)
          </summary>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-foreground">
            <li>
              <div className="flex flex-wrap items-center gap-2">
                <span>Baixe o certificado:</span>
                <Button size="sm" variant="outline" onClick={handleDownloadCert} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  cert.pem
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Salve na pasta do QZ Tray:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">C:\Program Files\QZ Tray</code>{" "}
                ·{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">/Applications/QZ Tray.app/Contents/Resources</code>{" "}
                ·{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">/opt/QZ Tray</code>.
              </p>
            </li>
            <li>
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Edite <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">qz-tray.properties</code> e adicione:
                </span>
                <Button size="sm" variant="outline" onClick={downloadQzProperties}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> exemplo
                </Button>
              </div>
              <pre className="mt-1 rounded bg-muted px-2 py-1 text-[11px]">authcert.override=cert.pem</pre>
            </li>
            <li>Reinicie o QZ Tray (clique direito no ícone → Sair → abrir de novo).</li>
          </ol>
        </details>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {onRetry && (
            <Button onClick={() => onRetry()} disabled={retrying}>
              {retrying ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Tentar novamente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
