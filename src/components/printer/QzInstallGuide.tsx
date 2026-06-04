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
            <div className="flex-1">
              <div className="font-medium">Baixe e rode o configurador Menuzin (Windows)</div>
              <Button
                size="sm"
                onClick={handleDownloadInstaller}
                disabled={installing}
                className="mt-1.5"
              >
                {installing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                menuzin-qz-setup.bat
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Clique direito → <strong>Executar como administrador</strong>. Ele já
                instala e confia no certificado para você. Se aparecer o SmartScreen
                azul, clique em <em>Mais informações → Executar assim mesmo</em>.
              </p>
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

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            Não estou no Windows ou preciso do cert.pem
          </summary>
          <div className="mt-2 space-y-2 text-foreground">
            <p>
              Baixe o cert e coloque-o no caminho correto do seu sistema, depois
              reinicie o QZ Tray:
            </p>
            <ul className="ml-3 list-disc space-y-0.5 text-xs">
              <li>
                macOS: <code>/Library/Application Support/qz/data/certificates/allowed.pem</code>
              </li>
              <li>
                Linux: <code>/etc/qz/data/certificates/allowed.pem</code>
              </li>
            </ul>
            <Button size="sm" variant="outline" onClick={handleDownloadCert} disabled={downloadingCert}>
              {downloadingCert ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              cert.pem
            </Button>
          </div>
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
              Testar de novo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
