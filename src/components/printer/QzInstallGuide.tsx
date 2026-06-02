import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Download, ExternalLink, FileText, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadQzCertificate, downloadQzProperties } from "@/lib/qz-tray";

interface QzInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Função para tentar reconectar — geralmente o mesmo handler de "Detectar". */
  onRetry?: () => void | Promise<void>;
  retrying?: boolean;
}

export function QzInstallGuide({ open, onOpenChange, onRetry, retrying }: QzInstallGuideProps) {
  const [downloading, setDownloading] = useState(false);

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
          <DialogTitle>Configurar QZ Tray</DialogTitle>
          <DialogDescription>
            Para imprimir sem o pop-up de aceite a cada impressão, instale o QZ Tray
            e marque o certificado da Menuzin como confiável seguindo os passos abaixo.
          </DialogDescription>
        </DialogHeader>

        <ol className="list-decimal space-y-3 pl-5 text-sm">
          <li>
            <div className="flex flex-wrap items-center gap-2">
              <span>Baixe e instale o QZ Tray:</span>
              <Button asChild size="sm" variant="outline">
                <a href="https://qz.io/download/" target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> qz.io/download
                </a>
              </Button>
            </div>
          </li>
          <li>
            <div className="flex flex-wrap items-center gap-2">
              <span>Baixe o certificado da Menuzin:</span>
              <Button size="sm" onClick={handleDownloadCert} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                cert.pem
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Salve o arquivo na pasta de instalação do QZ Tray:
              <br />
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                C:\Program Files\QZ Tray
              </code>{" "}
              (Windows) ·{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                /Applications/QZ Tray.app/Contents/Resources
              </code>{" "}
              (macOS) ·{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                /opt/QZ Tray
              </code>{" "}
              (Linux).
            </p>
          </li>
          <li>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Edite o arquivo{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  qz-tray.properties
                </code>{" "}
                e adicione a linha:
              </span>
              <Button size="sm" variant="outline" onClick={downloadQzProperties}>
                <FileText className="mr-1.5 h-3.5 w-3.5" /> exemplo
              </Button>
            </div>
            <pre className="mt-1 rounded bg-muted px-2 py-1 text-[11px]">
              authcert.override=cert.pem
            </pre>
          </li>
          <li>Reinicie o QZ Tray (clique direito no ícone da bandeja → Sair → abrir de novo).</li>
          <li>Volte aqui e clique em <strong>Tentar novamente</strong>.</li>
        </ol>

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
