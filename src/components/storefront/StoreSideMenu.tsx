import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Link } from "@tanstack/react-router";
import { LogIn, UtensilsCrossed, Percent, Info, X } from "lucide-react";
import type { Tenant } from "@/lib/domain-types";
import menuzinLogo from "@/assets/menuzin-logo.png.asset.json";

export function StoreSideMenu({
  open,
  onOpenChange,
  tenant,
  onOpenAbout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  onOpenAbout: () => void;
}) {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-[85%] max-w-sm flex-col p-0 sm:w-96">
        {/* Header */}
        <div className="flex items-center gap-3 border-b p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border bg-muted">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold">{tenant.logoLetter}</span>
            )}
          </div>
          <h2 className="min-w-0 flex-1 truncate text-base font-bold">{tenant.name}</h2>
          <button
            type="button"
            onClick={close}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          <Link
            to="/admin/login"
            onClick={close}
            className="flex items-center gap-4 px-5 py-4 text-sm font-medium hover:bg-muted/50"
          >
            <LogIn className="h-5 w-5" />
            Entrar
          </Link>
          <div className="mx-5 border-b" />

          <Link
            to="/$slug"
            params={{ slug: tenant.slug }}
            onClick={close}
            className="flex items-center gap-4 px-5 py-4 text-sm font-medium hover:bg-muted/50"
          >
            <UtensilsCrossed className="h-5 w-5" />
            Cardápio
          </Link>
          <div className="mx-5 border-b" />

          <Link
            to="/$slug/cupons"
            params={{ slug: tenant.slug }}
            onClick={close}
            className="flex items-center gap-4 px-5 py-4 text-sm font-medium hover:bg-muted/50"
          >
            <Percent className="h-5 w-5" />
            Cupons de Desconto
          </Link>
          <div className="mx-5 border-b" />

          <button
            type="button"
            onClick={() => {
              close();
              onOpenAbout();
            }}
            className="flex w-full items-center gap-4 px-5 py-4 text-left text-sm font-medium hover:bg-muted/50"
          >
            <Info className="h-5 w-5" />
            Sobre Nós
          </button>
        </nav>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 border-t px-5 py-6">
          <span className="text-xs text-muted-foreground">Desenvolvido por</span>
          <img src={menuzinLogo.url} alt="Menuzin" className="h-8 w-auto" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
