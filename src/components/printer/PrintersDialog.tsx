// Modal com a área de impressoras (lista + configuração), com rolagem interna.
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { PrintersManager } from "@/components/printer/PrintersManager";
import { useTenantPlan, UpgradeNotice } from "@/lib/plan-features";
import { Link } from "@tanstack/react-router";

interface PrintersDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PrintersDialog({ open, onOpenChange }: PrintersDialogProps) {
  const { can } = useTenantPlan();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Printer className="h-4 w-4 text-primary" /> Impressoras
          </DialogTitle>
          <DialogDescription className="text-xs">
            Escolha a impressora à esquerda e ajuste a configuração ao lado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PrintersManager
            mainDetail={
              <div className="space-y-3 text-sm">
                <p className="font-semibold">Impressora do Caixa (recibo)</p>
                <p className="text-muted-foreground text-xs">
                  A impressora principal da loja, o layout do cupom e a conexão com o QZ Tray
                  ficam na página completa de impressora.
                </p>
                <Button asChild size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                  <Link to="/admin/configuracoes/impressora">Abrir configuração completa</Link>
                </Button>
              </div>
            }
            canMultiple={can("multiplePrinters")}
            upgradeNotice={
              <UpgradeNotice
                title="Múltiplas impressoras no Plano Pro"
                description="Configure impressoras dedicadas para cozinha, bar e balcão no Plano Pro. A impressora principal de recibo continua disponível normalmente."
              />
            }
          />
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
