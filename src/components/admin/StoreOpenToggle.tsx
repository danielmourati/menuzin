import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Store, StoreIcon, Loader2, Power, PowerOff } from "lucide-react";
import { updateMyTenant } from "@/lib/tenants.functions";
import { toast } from "sonner";

type OpenMode = "auto" | "open" | "closed";

interface StoreOpenToggleProps {
  openMode?: OpenMode | null;
  isOpen?: boolean | null;
  disabled?: boolean;
}

export function StoreOpenToggle({ openMode, isOpen, disabled }: StoreOpenToggleProps) {
  const qc = useQueryClient();
  const effectiveOpen = openMode === "open" ? true : openMode === "closed" ? false : !!isOpen;

  const mutation = useMutation({
    mutationFn: (next: OpenMode) => updateMyTenant({ data: { open_mode: next } }),
    onSuccess: (_d, next) => {
      qc.invalidateQueries({ queryKey: ["my-tenant"] });
      toast.success(next === "open" ? "Loja aberta para pedidos" : "Loja fechada");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar status da loja"),
  });

  const handleClick = () => {
    mutation.mutate(effectiveOpen ? "closed" : "open");
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || mutation.isPending}
      size="sm"
      variant={effectiveOpen ? "default" : "outline"}
      className={
        effectiveOpen
          ? "h-9 gap-1.5 bg-success hover:bg-success/90 text-white"
          : "h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
      }
      title={effectiveOpen ? "Clique para fechar a loja" : "Clique para abrir a loja"}
    >
      {mutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : effectiveOpen ? (
        <Power className="h-4 w-4" />
      ) : (
        <PowerOff className="h-4 w-4" />
      )}
      <span className="hidden sm:inline text-xs font-semibold">
        {effectiveOpen ? "Loja aberta" : "Loja fechada"}
      </span>
    </Button>
  );
}
