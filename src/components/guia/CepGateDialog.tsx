// Location gate for the Guia Menuzin: the visitor must inform a CEP so we know
// which city the Guia should show. Stored inside the universal customer profile.
import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveCityByCep } from "@/lib/customers.functions";
import { useCustomerProfile, writeCustomerProfile } from "@/lib/customer-profile";


const maskCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export type GuiaLocation = { cep: string; city: string; uf: string | null };

export function useGuiaLocation() {
  const profile = useCustomerProfile();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const location: GuiaLocation | null =
    profile?.city && profile?.cep
      ? { cep: profile.cep, city: profile.city, uf: profile.uf ?? null }
      : null;

  return { location, needsLocation: hydrated && !location, hydrated };
}

export function CepGateDialog({
  open,
  onOpenChange,
  onResolved,
  dismissible = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onResolved?: (loc: GuiaLocation) => void;
  dismissible?: boolean;
}) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setError("Informe um CEP com 8 dígitos");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await resolveCityByCep({ data: { cep: digits } });
      if (!res.city) {
        setError("Não encontramos esse CEP. Confira e tente novamente.");
        return;
      }
      writeCustomerProfile({
        cep: res.cep,
        city: res.city,
        uf: res.uf,
        neighborhood: res.neighborhood,
      });
      onResolved?.({ cep: res.cep, city: res.city, uf: res.uf });
      onOpenChange(false);
    } catch {
      setError("Não foi possível consultar o CEP agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v || dismissible) onOpenChange(v); }}>
      <DialogContent
        className="max-w-sm rounded-xl"
        onInteractOutside={(e) => !dismissible && e.preventDefault()}
        onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Onde você está?</DialogTitle>
          <DialogDescription className="text-center">
            Informe seu CEP para ver as lojas e ofertas da sua cidade.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            inputMode="numeric"
            placeholder="00000-000"
            value={cep}
            maxLength={9}
            onChange={(e) => {
              setCep(maskCep(e.target.value));
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="h-12 text-center text-lg tracking-wider"
          />
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <Button className="h-12 w-full" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ver o Guia da minha cidade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
