import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SettingsBreadcrumb } from "@/components/admin/SettingsBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { PrinterConfigModal } from "@/components/printer/PrinterConfigModal";
import { QzInstallGuide } from "@/components/printer/QzInstallGuide";
import { checkQzStatusAndTrust } from "@/lib/qz-tray";
import { PlanGate } from "@/components/subscription/PlanGate";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes/impressora")({
  component: () => (
    <PlanGate
      min="pro"
      title="Impressora"
      featureLabel="Configuração de impressora"
      backTo="/admin/configuracoes"
    >
      <PrinterSettingsPage />
    </PlanGate>
  ),
});

function PrinterSettingsPage() {
  const navigate = useNavigate();
  const [printersOpen, setPrintersOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const initPrinterFlow = async () => {
    setLoading(true);
    try {
      const status = await checkQzStatusAndTrust();
      if (status.ok && !status.prompted) {
        setPrintersOpen(true);
      } else {
        setGuideOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void initPrinterFlow();
  }, []);

  const handleRetryGuide = async () => {
    setLoading(true);
    try {
      const status = await checkQzStatusAndTrust();
      if (status.ok && !status.prompted) {
        toast.success(`QZ Tray reconhecido e validado! ${status.printersCount} impressora(s) encontrada(s).`);
        setGuideOpen(false);
        setPrintersOpen(true);
      } else if (status.ok && status.prompted) {
        toast.error("O QZ Tray pediu confirmação manual. Execute o auto-configurador como Administrador.");
      } else {
        toast.error("QZ Tray ainda não foi detectado em execução no computador.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <SettingsBreadcrumb current="Impressora" />

        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Printer className="h-8 w-8 text-primary" />
            <h1 className="text-lg font-semibold">Impressoras</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Escolha qual impressora usar no caixa, na cozinha e no bar, e teste a
              impressão em poucos cliques.
            </p>
            <Button className="mt-1" onClick={initPrinterFlow} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir configuração
            </Button>
          </CardContent>
        </Card>
      </div>

      <QzInstallGuide
        open={guideOpen}
        onOpenChange={(v) => {
          setGuideOpen(v);
          if (!v && !printersOpen) navigate({ to: "/admin/configuracoes" });
        }}
        onRetry={handleRetryGuide}
        retrying={loading}
      />

      <PrinterConfigModal
        open={printersOpen}
        onOpenChange={(v) => {
          setPrintersOpen(v);
          if (!v) navigate({ to: "/admin/configuracoes" });
        }}
      />
    </AdminLayout>
  );
}
