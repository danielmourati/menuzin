// Guia simplificado em 3 passos. O passo de "confiar no cert" deixou de ser
// uma cópia manual de URL — o instalador .bat embute o cert e grava em
// `allowed.pem` automaticamente. cert.pem fica disponível como fallback
// (macOS/Linux) num link discreto no rodapé.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { downloadQzCertificate, downloadQzWindowsInstaller } from "@/lib/qz-tray";

interface QzInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Função para tentar reconectar — geralmente o mesmo handler de "Detectar". */
  onRetry?: () => void | Promise<void>;
  retrying?: boolean;
}

export function QzInstallGuide({ open, onOpenChange, onRetry, retrying }: QzInstallGuideProps) {
  const [installing, setInstalling] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const handleDownloadInstaller = async () => {
    setInstalling(true);
    try {
      await downloadQzWindowsInstaller();
      toast.success("Configurador baixado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setInstalling(false);
    }
  };

  const handleDownloadCert = async () => {
    setDownloadingCert(true);
    try {
      await downloadQzCertificate();
      toast.success("cert.pem baixado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloadingCert(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar QZ Tray em 3 passos</DialogTitle>
          <DialogDescription>
            Faça uma vez por máquina. Depois disso, a impressão acontece direto,
            sem pop-up de autorização.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              1
            </span>
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
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              2
            </span>
            <div className="flex-1 space-y-2">
              <div className="font-medium">Certificado de Segurança (cert.pem) — Obrigatório para todos os SOs</div>
              <p className="text-xs text-muted-foreground">
                O arquivo <code className="font-semibold text-foreground">cert.pem</code> é <strong>imprescindível</strong> para que o QZ Tray reconheça o Menuzin e imprima sem pop-ups de segurança.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleDownloadCert}
                  disabled={downloadingCert}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  {downloadingCert ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Baixar cert.pem (Todos os sistemas)
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadInstaller}
                  disabled={installing}
                  className="h-8 gap-1.5 text-xs"
                >
                  {installing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Auto-configurador (Windows .bat)
                </Button>
              </div>

              <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground space-y-1">
                <div>• <strong>No Windows:</strong> Execute o <code>menuzin-qz-setup.bat</code> como administrador ou copie o <code>cert.pem</code> para <code>%PROGRAMDATA%\qz\data\certificates\allowed.pem</code>.</div>
                <div>• <strong>No macOS:</strong> Copie para <code>/Library/Application Support/qz/data/certificates/allowed.pem</code>.</div>
                <div>• <strong>No Linux:</strong> Copie para <code>/etc/qz/data/certificates/allowed.pem</code>.</div>
              </div>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              3
            </span>
            <div className="flex-1">
              <div className="font-medium">
                Volte aqui e clique em <em>Testar de novo</em>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Se ficar verde sem pop-up, está pronto. Pronto para imprimir cupons direto.
              </p>
            </div>
          </li>
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
              Testar de novo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
