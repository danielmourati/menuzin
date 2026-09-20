import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Loader2, Phone, User, Bike } from "lucide-react";
import { toast } from "sonner";
import { upsertDriver, type DriverRow } from "@/lib/drivers.functions";

interface CreateDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (driver: DriverRow) => void;
}

export function CreateDriverModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateDriverModalProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");

  const resetForm = () => {
    setName("");
    setPhone("");
    setVehicle("");
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertDriver({
        data: {
          id: null,
          name,
          phone,
          vehicle: vehicle || null,
          active: true,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Entregador "${res.driver.name}" cadastrado com sucesso!`);
      qc.invalidateQueries({ queryKey: ["my-drivers"] });
      resetForm();
      onClose();
      if (onSuccess && res.driver) {
        onSuccess(res.driver);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao cadastrar entregador.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do entregador.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Informe o telefone/WhatsApp do entregador.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Truck className="h-5 w-5 text-primary" /> Cadastrar Novo Entregador
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Preencha os dados do entregador/motoboy. Após salvar, ele estará selecionado para este pedido.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-driver-name" className="text-xs font-semibold flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Nome Completo *
            </Label>
            <Input
              id="quick-driver-name"
              placeholder="Ex: Carlos Motoboy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-xl"
              required
              autoFocus
            />
          </div>

          {/* Telefone / WhatsApp */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-driver-phone" className="text-xs font-semibold flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> WhatsApp / Telefone *
            </Label>
            <Input
              id="quick-driver-phone"
              placeholder="Ex: 86999887766"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 rounded-xl"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Com DDD. Usado para notificação e envio do endereço via WhatsApp.
            </p>
          </div>

          {/* Veículo */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-driver-vehicle" className="text-xs font-semibold flex items-center gap-1.5">
              <Bike className="h-3.5 w-3.5 text-muted-foreground" /> Veículo / Modelo (opcional)
            </Label>
            <Input
              id="quick-driver-vehicle"
              placeholder="Ex: Moto CG 160 Fan, Bicicleta..."
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          <DialogFooter className="pt-3 border-t mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={saveMutation.isPending}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar e Usar no Pedido"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
