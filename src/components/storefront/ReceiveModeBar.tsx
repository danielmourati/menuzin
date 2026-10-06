import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ChevronRight, Bike, Home, Utensils, Loader2, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listPublicDeliveryZones, resolveDeliveryFee } from "@/lib/delivery-zones.functions";
import { lookupByCep } from "@/lib/viacep";
import { readReceivePref, writeReceivePref, type ReceivePref } from "@/lib/receive-pref";
import { brl } from "@/lib/format";
import type { Tenant } from "@/lib/domain-types";

export function ReceiveModeBar({ tenant }: { tenant: Tenant }) {
  const slug = tenant.slug;
  const [pref, setPref] = useState<ReceivePref | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  useEffect(() => {
    setPref(readReceivePref(slug));
    const h = () => setPref(readReceivePref(slug));
    window.addEventListener("menuzin:receive-pref", h);
    return () => window.removeEventListener("menuzin:receive-pref", h);
  }, [slug]);

  const storeAddr = `${tenant.address}${tenant.addressNumber ? ", " + tenant.addressNumber : ""}`;
  const isPresenca = tenant.plan !== "pro";
  const canDelivery = isPresenca || tenant.acceptsDelivery;
  const canTakeout = isPresenca || tenant.acceptsTakeout;
  const canDinein = isPresenca || tenant.acceptsDinein;

  const choose = (mode: ReceivePref["mode"]) => {
    setMenuOpen(false);
    if (mode === "entrega") {
      if (tenant.deliveryMode === "none") {
        writeReceivePref(slug, { mode, fee: 0, label: "Entrega grátis" });
        return;
      }
      setCalcOpen(true);
      return;
    }
    writeReceivePref(slug, { mode });
  };

  const summary = (() => {
    if (!pref) return "Calcular taxa e tempo de entrega";
    if (pref.mode === "retirada") return `Retirar · ≈ ${tenant.takeoutTime || tenant.prepTime || "—"}`;
    if (pref.mode === "consumo_local") return "Consumir no local";
    const parts = [pref.label || "Entregar"];
    if (pref.fee != null) parts.push(pref.fee > 0 ? brl(pref.fee) : "Grátis");
    if (tenant.deliveryTime) parts.push(`≈ ${tenant.deliveryTime}`);
    return parts.join(" · ");
  })();

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-2 flex w-full items-center gap-2.5 rounded-2xl border border-dashed bg-muted/50 px-4 py-2.5 text-left text-sm font-semibold active:opacity-80"
          >
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">{summary}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,380px)] rounded-2xl p-2">
          <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Como você quer receber</p>
          {canDelivery && (
            <ModeRow icon={<Bike className="h-6 w-6 text-primary" />} title="Entregar" active={pref?.mode === "entrega"} onClick={() => choose("entrega")} />
          )}
          {canTakeout && (
            <ModeRow icon={<Home className="h-6 w-6" />} title="Retirar" subtitle={storeAddr} active={pref?.mode === "retirada"} onClick={() => choose("retirada")} />
          )}
          {canDinein && (
            <ModeRow icon={<Utensils className="h-6 w-6" />} title="Consumir no local" subtitle={storeAddr} active={pref?.mode === "consumo_local"} onClick={() => choose("consumo_local")} />
          )}
        </PopoverContent>
      </Popover>
      <DeliveryCalcDialog open={calcOpen} onOpenChange={setCalcOpen} tenant={tenant} />
    </>
  );
}

function ModeRow({ icon, title, subtitle, active, onClick }: { icon: React.ReactNode; title: string; subtitle?: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left hover:bg-muted/60">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        {subtitle && <span className="block truncate text-sm text-muted-foreground underline decoration-dotted underline-offset-4">{subtitle}</span>}
      </span>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
        {active && <Check className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

function DeliveryCalcDialog({ open, onOpenChange, tenant }: { open: boolean; onOpenChange: (v: boolean) => void; tenant: Tenant }) {
  const slug = tenant.slug;
  const [cep, setCep] = useState("");
  const [zoneId, setZoneId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ fee: number; label: string; cep?: string; neighborhood?: string; zoneId?: string } | null>(null);

  const { data: zonesData } = useQuery({
    queryKey: ["public-delivery-zones", slug],
    queryFn: () => listPublicDeliveryZones({ data: { tenant_slug: slug } }),
    enabled: open && tenant.deliveryMode === "neighborhood",
    staleTime: 60_000,
  });
  const zones = zonesData?.zones ?? [];

  useEffect(() => {
    if (!open) {
      setMsg(null);
      setResult(null);
    }
  }, [open]);

  const onZone = (id: string) => {
    setZoneId(id);
    const z = zones.find((x) => x.id === id);
    if (z) {
      setMsg(null);
      setResult({ fee: z.fee, label: `Entregar em ${z.neighborhood}`, neighborhood: z.neighborhood, zoneId: z.id });
    }
  };

  const searchCep = async () => {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return setMsg("Digite um CEP válido.");
    setBusy(true);
    setMsg(null);
    setResult(null);
    try {
      const r = await lookupByCep(d);
      if (r.status !== "ok") {
        setMsg("CEP não encontrado.");
        return;
      }
      const a = r.results[0];
      const res = await resolveDeliveryFee({
        data: { tenant_slug: slug, cep: d, neighborhood: a.bairro, street: a.logradouro, number: "1", city: a.localidade, state: a.uf },
      });
      if (!res.available) {
        setMsg(res.message || "Não entregamos neste endereço.");
        return;
      }
      setResult({
        fee: res.fee,
        label: `Entregar em ${a.bairro || a.logradouro || a.localidade}`,
        cep: `${d.slice(0, 5)}-${d.slice(5)}`,
        neighborhood: res.neighborhood ?? a.bairro,
      });
    } catch {
      setMsg("Não foi possível calcular agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!result) return;
    writeReceivePref(slug, {
      mode: "entrega",
      fee: result.fee,
      label: result.label,
      cep: result.cep ?? null,
      neighborhood: result.neighborhood ?? null,
      zoneId: result.zoneId ?? null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Calcular taxa e tempo de entrega</DialogTitle>
        </DialogHeader>
        <p className="font-semibold">Entregar no meu endereço</p>
        <div className="space-y-3 rounded-2xl border p-4">
          {zones.length > 0 && (
            <Select value={zoneId} onValueChange={onZone}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione sua região" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.neighborhood} · {brl(z.fee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-2">
            <Input
              value={cep}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 8);
                setCep(d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d);
              }}
              onKeyDown={(e) => e.key === "Enter" && searchCep()}
              placeholder="Digite o CEP"
              inputMode="numeric"
              className="h-11"
            />
            <Button onClick={searchCep} disabled={busy} className="h-11 shrink-0">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar CEP"}
            </Button>
          </div>
          {msg && <p className="text-sm text-destructive">{msg}</p>}
        </div>
        {result && (
          <div className="space-y-3 rounded-2xl bg-muted/60 p-4">
            <p className="text-sm font-semibold">{result.label}</p>
            <div className="flex justify-between text-sm">
              <span>Taxa de entrega</span>
              <span className="font-bold">{result.fee > 0 ? brl(result.fee) : "Grátis"}</span>
            </div>
            {tenant.deliveryTime && (
              <div className="flex justify-between text-sm">
                <span>Tempo estimado</span>
                <span className="font-bold">≈ {tenant.deliveryTime}</span>
              </div>
            )}
            <Button className="h-11 w-full" onClick={confirm}>
              Confirmar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
