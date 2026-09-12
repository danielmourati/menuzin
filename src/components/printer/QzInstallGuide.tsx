import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

export function QzInstallGuide({
  open,
  onOpenChange,
  onRetry,
  retrying,
}: QzInstallGuideProps) {
  const [installing, setInstalling] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const handleDownloadInstaller = async () => {
    setInstalling(true);
    try {
      await downloadQzWindowsInstaller();
      toast.success("Auto-configurador baixado.");
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
      <DialogContent className="max-w-lg p-6 sm:p-7 rounded-3xl bg-[#FAF9F6] dark:bg-zinc-950 border text-foreground">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Configurar QZ Tray em 3 passos
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Faça uma vez por máquina. Depois disso, a impressão acontece direto,
            sem pop-up de autorização.
          </p>
        </DialogHeader>

        <ol className="space-y-5 text-sm my-2">
          {/* Passo 1 */}
          <li className="flex items-start gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
              1
            </span>
            <div className="flex-1 space-y-2">
              <div className="font-semibold text-foreground text-sm">
                Instale o QZ Tray
              </div>
              <div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-full h-8 px-4 text-xs font-medium border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs hover:bg-slate-50"
                >
                  <a
                    href="https://qz.io/download/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> qz.io/download
                  </a>
                </Button>
              </div>
            </div>
          </li>

          {/* Passo 2 */}
          <li className="flex items-start gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
              2
            </span>
            <div className="flex-1 space-y-2.5">
              <div className="font-semibold text-foreground text-sm leading-tight">
                Baixar Certificado e Auto-configurador
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Baixe o <code className="font-semibold text-foreground">cert.pem</code> (botão 1) e o <code className="font-semibold text-foreground">Auto-configurador .bat</code> (botão 2) na <strong>mesma pasta</strong> do seu computador.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Button
                  size="sm"
                  onClick={handleDownloadCert}
                  disabled={downloadingCert}
                  className="rounded-full h-9 px-4 text-xs font-semibold bg-[#F95716] hover:bg-[#e04b0f] text-white shadow-2xs gap-1.5"
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
                  className="rounded-full h-9 px-4 text-xs font-medium border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs hover:bg-slate-50 gap-1.5"
                >
                  {installing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Auto-configurador (Windows .bat)
                </Button>
              </div>

              {/* Caixa de instrução Windows */}
              <div className="rounded-2xl border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5 font-sans leading-relaxed">
                <div>
                  • <strong>No Windows:</strong> Certifique-se de baixar ambos os arquivos na <strong>mesma pasta</strong>. Em seguida, clique com o botão direito sobre o arquivo <code className="font-semibold text-foreground">menuzin-qz-setup.bat</code> e selecione <strong>"Executar como administrador"</strong>.
                </div>
              </div>
            </div>
          </li>

          {/* Passo 3 */}
          <li className="flex items-start gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
              3
            </span>
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-foreground text-sm">
                Volte aqui e clique em <em>Testar de novo</em>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Assim que a conexão for reconhecida e validada sem pop-ups, a janela de escolha de impressora será aberta automaticamente.
              </p>
            </div>
          </li>
        </ol>

        <DialogFooter className="flex-row items-center justify-end gap-2 sm:gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full h-9 px-5 text-xs font-medium border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            Fechar
          </Button>

          {onRetry && (
            <Button
              onClick={() => onRetry()}
              disabled={retrying}
              className="rounded-full h-9 px-5 text-xs font-semibold bg-[#F95716] hover:bg-[#e04b0f] text-white shadow-2xs gap-1.5"
            >
              {retrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Testar de novo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
