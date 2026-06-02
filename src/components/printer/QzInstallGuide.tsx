import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Download, ExternalLink, FileText, RefreshCw, Loader2 } from "lucide-react";
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
          <DialogTitle>Configurar QZ Tray</DialogTitle>
          <DialogDescription>
            Para imprimir sem o pop-up de aceite a cada impressão, basta instalar o QZ Tray
            e rodar o instalador da Menuzin. Tudo é feito em dois cliques.
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
              <span>Baixe o instalador da Menuzin (Windows):</span>
              <Button size="sm" onClick={handleDownloadInstaller} disabled={installing}>
                {installing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                menuzin-qz-setup.bat
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Clique com o botão direito no arquivo baixado e escolha{" "}
              <strong>Executar como administrador</strong>. Se o Windows mostrar um aviso azul (SmartScreen),
              clique em <em>Mais informações → Executar assim mesmo</em>. O instalador copia o certificado
              para a pasta do QZ Tray e ajusta as configurações automaticamente.
            </p>
          </li>
          <li>Volte aqui e clique em <strong>Tentar novamente</strong>.</li>
        </ol>

        <div className="rounded-md border bg-muted/30 p-3 text-xs">
          <div className="mb-1.5 font-medium">
            Se ainda aparecer o prompt do QZ Tray (Site Manager)
          </div>
          <p className="mb-2 text-muted-foreground">
            Na primeira impressão o QZ Tray pode mostrar uma janela perguntando se você confia neste
            site. Faça uma vez por máquina e o prompt some.
          </p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              No ícone do QZ Tray (bandeja do sistema) → <strong>Advanced</strong> →
              <strong> Site Manager</strong>.
            </li>
            <li>
              Aba <strong>Allowed</strong> → <em>Add</em> → cole a URL deste painel (o domínio que
              você está usando agora).
            </li>
            <li>
              Aba <strong>Blocked</strong> → se este domínio estiver lá, selecione e clique em{" "}
              <em>Remove</em>.
            </li>
            <li>
              Importe o certificado em <strong>Trusted</strong>: <em>Add</em> → aponte para o arquivo
              baixado em{" "}
              <a
                href="/api/public/qz-cert.crt"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                /api/public/qz-cert.crt
              </a>
              .
            </li>
            <li>
              Quando o prompt aparecer pela primeira vez, marque{" "}
              <strong>“Remember this decision”</strong> e clique em <em>Allow</em>. Da próxima vez
              não aparece mais.
            </li>
            <li>
              Volte aqui e clique em <strong>Teste de conexão</strong> — deve completar em menos de
              2s, sem prompt.
            </li>
          </ol>
        </div>


        <details className="text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground">
            Prefiro fazer manualmente (macOS, Linux ou avançado)
          </summary>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
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
                <span className="text-xs text-muted-foreground">
                  ou via URL direta:&nbsp;
                  <a
                    href="/api/public/qz-cert.crt"
                    className="underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    /api/public/qz-cert.crt
                  </a>
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Salve na pasta do QZ Tray:
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
                  e adicione:
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
