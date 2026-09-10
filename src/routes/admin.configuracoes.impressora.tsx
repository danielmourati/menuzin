import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SettingsBreadcrumb } from "@/components/admin/SettingsBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PrinterConfigModal } from "@/components/printer/PrinterConfigModal";
import { PlanGate } from "@/components/subscription/PlanGate";

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
  const [open, setOpen] = useState(true);

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
            <Button className="mt-1" onClick={() => setOpen(true)}>
              Abrir configuração
            </Button>
          </CardContent>
        </Card>
      </div>

      <PrinterConfigModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) navigate({ to: "/admin/configuracoes" });
        }}
      />
    </AdminLayout>
  );
}
