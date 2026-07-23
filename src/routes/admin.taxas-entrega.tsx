import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, MapPin, Ban, DollarSign, Map as MapIcon, Check, Search } from "lucide-react";
import { toast } from "sonner";
import {
  listMyDeliveryZones, upsertDeliveryZone, deleteDeliveryZone,
  type DeliveryZoneRow,
} from "@/lib/delivery-zones.functions";
import { getMyTenant, updateMyTenant } from "@/lib/tenants.functions";
import { searchCepRanges, type CepRangeResult } from "@/lib/cep-ranges.functions";
import { brl } from "@/lib/format";
import {
  lookupByCep, searchByAddress, rankResults, type ViaCepResult, type ViaCepResponse,
} from "@/lib/viacep";

export const Route = createFileRoute("/admin/taxas-entrega")({
  component: DeliveryZonesPage,
});

type Mode = "none" | "single" | "neighborhood";

type Editing = {
  id?: string;
  neighborhood: string;
  city: string;
  uf: string;
  fee: number;
  min_order_total: number;
  estimated_minutes: number | null;
  cep_start: string;
  cep_end: string;
  active: boolean;
};

const empty = (defaults?: { city?: string; uf?: string }): Editing => ({
  neighborhood: "",
  city: defaults?.city ?? "",
  uf: (defaults?.uf ?? "").toUpperCase(),
  fee: 0,
  min_order_total: 0,
  estimated_minutes: null,
  cep_start: "",
  cep_end: "",
  active: true,
});

const maskCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};
const cepDigits = (v: string) => v.replace(/\D/g, "");

const stripAcc = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const neighborhoodKey = (name: string, city: string, uf: string) => {
  const base = stripAcc(name.trim()).toLowerCase().replace(/\s+\d+$/, "").trim();
  return `${base}|${stripAcc(city.trim()).toLowerCase()}|${uf.trim().toLowerCase()}`;
};
const neighborhoodBaseName = (name: string) =>
  name.trim().replace(/\s+\d+$/, "").trim() || name;

function DeliveryZonesPage() {
  const qc = useQueryClient();

  const { data: tenantData } = useQuery({
    queryKey: ["admin", "my-tenant"],
    queryFn: async () => (await getMyTenant({ data: {} })).tenant,
  });

  const [mode, setMode] = useState<Mode>("single");
  const [singleFee, setSingleFee] = useState<number>(0);

  useEffect(() => {
    if (tenantData) {
      setMode(((tenantData as { delivery_mode?: Mode }).delivery_mode ?? "single") as Mode);
      setSingleFee(Number((tenantData as { delivery_fee?: number }).delivery_fee ?? 0));
    }
  }, [tenantData]);

  const tenantCity = (tenantData as { city?: string } | undefined)?.city ?? "";
  const tenantUf = ((tenantData as { state?: string } | undefined)?.state ?? "").toUpperCase();

  const saveConfigMut = useMutation({
    mutationFn: () =>
      updateMyTenant({
        data: {
          delivery_mode: mode,
          ...(mode === "single" ? { delivery_fee: singleFee } : {}),
          ...(mode === "none" ? { delivery_fee: 0 } : {}),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "my-tenant"] });
      toast.success("Configuração de entrega salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "delivery-zones"],
    queryFn: async () => (await listMyDeliveryZones()).zones,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const saveMut = useMutation({
    mutationFn: (input: Editing) =>
      upsertDeliveryZone({
        data: {
          id: input.id,
          neighborhood: input.neighborhood,
          fee: input.fee,
          min_order_total: input.min_order_total,
          estimated_minutes: input.estimated_minutes,
          cep_start: cepDigits(input.cep_start) || null,
          cep_end: cepDigits(input.cep_end) || null,
          city: input.city.trim() || null,
          uf: input.uf.trim().toUpperCase() || null,
          active: input.active,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "delivery-zones"] });
      toast.success("Bairro salvo");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryZone({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "delivery-zones"] });
      toast.success("Bairro excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (z: DeliveryZoneRow) =>
      upsertDeliveryZone({
        data: {
          id: z.id,
          neighborhood: z.neighborhood,
          fee: Number(z.fee),
          min_order_total: Number(z.min_order_total),
          estimated_minutes: z.estimated_minutes,
          cep_start: z.cep_start ?? null,
          cep_end: z.cep_end ?? null,
          city: z.city ?? null,
          uf: z.uf ?? null,
          active: !z.active,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "delivery-zones"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = data ?? [];
  const [groupDuplicates, setGroupDuplicates] = useState(true);

  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; baseName: string; city: string; uf: string; items: DeliveryZoneRow[] }>();
    for (const z of list) {
      const key = neighborhoodKey(z.neighborhood, z.city ?? "", (z.uf ?? "").toUpperCase());
      const existing = map.get(key);
      if (existing) existing.items.push(z);
      else map.set(key, {
        key,
        baseName: neighborhoodBaseName(z.neighborhood),
        city: z.city ?? "",
        uf: (z.uf ?? "").toUpperCase(),
        items: [z],
      });
    }
    return Array.from(map.values());
  }, [list]);

  const openNew = () => { setEditing(empty({ city: tenantCity, uf: tenantUf })); setOpen(true); };
  const openEdit = (z: DeliveryZoneRow) => {
    setEditing({
      id: z.id,
      neighborhood: z.neighborhood,
      city: z.city ?? tenantCity,
      uf: (z.uf ?? tenantUf).toUpperCase(),
      fee: Number(z.fee),
      min_order_total: Number(z.min_order_total),
      estimated_minutes: z.estimated_minutes,
      cep_start: z.cep_start ? maskCep(z.cep_start) : "",
      cep_end: z.cep_end ? maskCep(z.cep_end) : "",
      active: z.active,
    });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.neighborhood.trim()) return toast.error("Informe o bairro");
    if (editing.fee < 0) return toast.error("Taxa inválida");
    if (editing.uf && editing.uf.trim().length !== 2) return toast.error("UF deve ter 2 letras");
    const cs = cepDigits(editing.cep_start);
    const ce = cepDigits(editing.cep_end);
    if (cs && cs.length !== 8) return toast.error("CEP inicial inválido");
    if (ce && ce.length !== 8) return toast.error("CEP final inválido");
    if (cs && ce && cs > ce) return toast.error("CEP inicial deve ser menor ou igual ao CEP final");
    saveMut.mutate(editing);
  };

  return (
    <AdminLayout
      title="Taxas de entrega"
      action={mode === "neighborhood" ? (
        <Button size="sm" onClick={openNew} className="font-bold text-xs">
          <Plus className="mr-1.5 h-4 w-4" /> Novo bairro
        </Button>
      ) : undefined}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Configuração da taxa de entrega</CardTitle>
            <CardDescription>
              Escolha como sua loja cobra o frete. A configuração é aplicada automaticamente no checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ModeCard
                active={mode === "none"}
                onClick={() => setMode("none")}
                icon={<Ban className="h-5 w-5" />}
                title="Sem taxa de entrega"
                description="Não cobra frete em nenhum pedido."
              />
              <ModeCard
                active={mode === "single"}
                onClick={() => setMode("single")}
                icon={<DollarSign className="h-5 w-5" />}
                title="Taxa única"
                description="Uma única taxa para todas as entregas."
              />
              <ModeCard
                active={mode === "neighborhood"}
                onClick={() => setMode("neighborhood")}
                icon={<MapIcon className="h-5 w-5" />}
                title="Taxa por bairro"
                description="Cobra de acordo com o bairro/CEP do cliente."
              />
            </div>

            {mode === "single" && (
              <div className="max-w-xs">
                <Label>Valor da taxa única</Label>
                <CurrencyInput className="mt-1.5" value={singleFee} onChange={setSingleFee} />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Aplicada automaticamente em todos os pedidos de entrega.
                </p>
              </div>
            )}

            {mode === "none" && (
              <p className="text-xs text-muted-foreground">
                Os clientes verão <strong>Grátis</strong> na taxa de entrega.
              </p>
            )}

            <div>
              <Button onClick={() => saveConfigMut.mutate()} disabled={saveConfigMut.isPending}>
                {saveConfigMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar configuração
              </Button>
            </div>
          </CardContent>
        </Card>

        {mode === "neighborhood" && (
          <Card>
            <CardHeader>
              <CardTitle>Bairros atendidos</CardTitle>
              <CardDescription>
                Cadastre os bairros, faixas de CEP e taxas. O CEP permite identificar a área automaticamente no checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="grid place-items-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : list.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                  <MapPin className="h-10 w-10" />
                  <p className="text-sm max-w-sm">
                    Nenhum bairro cadastrado. Adicione bairros para começar a cobrar por área.
                  </p>
                  <Button size="sm" onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" /> Cadastrar primeiro bairro
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {list.map((z) => (
                    <div key={z.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-base truncate">{z.neighborhood}</span>
                          <Badge variant={z.active ? "default" : "secondary"}>{z.active ? "Ativo" : "Inativo"}</Badge>
                          <Badge variant="outline">Taxa {brl(Number(z.fee))}</Badge>
                          {Number(z.min_order_total) > 0 && (
                            <Badge variant="outline">Mín. {brl(Number(z.min_order_total))}</Badge>
                          )}
                          {z.estimated_minutes && (
                            <Badge variant="outline">~{z.estimated_minutes} min</Badge>
                          )}
                          {(z.city || z.uf) && (
                            <Badge variant="outline">{[z.city, z.uf].filter(Boolean).join("/")}</Badge>
                          )}
                          {(z.cep_start || z.cep_end) && (
                            <Badge variant="outline">
                              CEP {z.cep_start ? maskCep(z.cep_start) : "?"} → {z.cep_end ? maskCep(z.cep_end) : "?"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={z.active} onCheckedChange={() => toggleMut.mutate(z)} />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(z)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => { if (confirm(`Excluir o bairro ${z.neighborhood}?`)) delMut.mutate(z.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar bairro" : "Novo bairro"}</DialogTitle>
            <DialogDescription>
              Busque pelo bairro, cidade, rua ou CEP para preencher automaticamente os campos via ViaCEP. Você ainda pode ajustar tudo manualmente.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 overflow-y-auto -mx-6 px-6 flex-1 min-h-0">
              <ViaCepSearch
                city={editing.city}
                uf={editing.uf}
                onSelect={(r) =>
                  setEditing((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      neighborhood: r.bairro || prev.neighborhood,
                      city: r.localidade || prev.city,
                      uf: (r.uf || prev.uf).toUpperCase(),
                      cep_start: maskCep(r.cep),
                      cep_end: maskCep(r.cep),
                    };
                  })
                }
                onSelectLocal={(r) =>
                  setEditing((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      neighborhood: r.neighborhood || prev.neighborhood,
                      city: r.city || prev.city,
                      uf: (r.uf || prev.uf).toUpperCase(),
                      cep_start: maskCep(r.cep_start),
                      cep_end: maskCep(r.cep_end),
                    };
                  })
                }
              />

              <div>
                <Label>Bairro *</Label>
                <Input
                  className="mt-1.5"
                  value={editing.neighborhood}
                  onChange={(e) => setEditing({ ...editing, neighborhood: e.target.value })}
                  placeholder="Ex: Centro"
                  maxLength={120}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Cidade</Label>
                  <Input
                    className="mt-1.5"
                    value={editing.city}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                    placeholder="Ex: Parnaíba"
                    maxLength={80}
                  />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input
                    className="mt-1.5 uppercase"
                    value={editing.uf}
                    onChange={(e) => setEditing({ ...editing, uf: e.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="PI"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CEP inicial</Label>
                  <Input
                    className="mt-1.5"
                    value={editing.cep_start}
                    onChange={(e) => setEditing({ ...editing, cep_start: maskCep(e.target.value) })}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label>CEP final</Label>
                  <Input
                    className="mt-1.5"
                    value={editing.cep_end}
                    onChange={(e) => setEditing({ ...editing, cep_end: maskCep(e.target.value) })}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label>Taxa (R$) *</Label>
                  <CurrencyInput
                    className="mt-1.5"
                    value={editing.fee}
                    onChange={(v) => setEditing({ ...editing, fee: v })}
                  />
                </div>
                <div>
                  <Label>Pedido mínimo (R$)</Label>
                  <CurrencyInput
                    className="mt-1.5"
                    value={editing.min_order_total}
                    onChange={(v) => setEditing({ ...editing, min_order_total: v })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Tempo estimado (min)</Label>
                  <Input
                    className="mt-1.5"
                    type="number" min={1}
                    placeholder="Opcional"
                    value={editing.estimated_minutes ?? ""}
                    onChange={(e) => setEditing({ ...editing, estimated_minutes: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm">Ativo</Label>
                  <p className="text-xs text-muted-foreground">Desative para ocultar este bairro no checkout.</p>
                </div>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function ModeCard({
  active, onClick, icon, title, description,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition ${
        active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          {icon}
        </span>
        <span className="font-semibold">{title}</span>
        {active && <Check className="ml-auto h-4 w-4 text-primary" />}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "viacep"; results: ViaCepResult[]; selectedCep?: string }
  | { kind: "local"; results: CepRangeResult[]; reason: "empty" | "error" }
  | { kind: "empty" }
  | { kind: "error" }
  | { kind: "need-context" };

function ViaCepSearch({
  city, uf, onSelect, onSelectLocal,
}: {
  city: string;
  uf: string;
  onSelect: (r: ViaCepResult) => void;
  onSelectLocal: (r: CepRangeResult) => void;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 500);
    return () => clearTimeout(t);
  }, [q]);

  const ctx = useMemo(() => ({ city: city.trim(), uf: uf.trim().toUpperCase() }), [city, uf]);

  useEffect(() => {
    let cancelled = false;
    const term = debounced;
    if (!term) { setState({ kind: "idle" }); return; }

    const digits = term.replace(/\D/g, "");
    const isCep = digits.length === 8 && /^[\d\s-]+$/.test(term);

    const run = async () => {
      setState({ kind: "loading" });

      let response: ViaCepResponse;
      if (isCep) {
        response = await lookupByCep(digits);
      } else {
        if (term.length < 3) { setState({ kind: "idle" }); return; }
        if (!ctx.uf || ctx.city.length < 3) {
          setState({ kind: "need-context" });
          return;
        }
        response = await searchByAddress({ uf: ctx.uf, city: ctx.city, street: term });
      }
      if (cancelled) return;

      if (response.status === "ok") {
        const ranked = rankResults(response.results, isCep ? "" : term).slice(0, 10);
        setState({ kind: "viacep", results: ranked });
        return;
      }

      // Fallback to local cep_ranges
      try {
        const { results } = await searchCepRanges({ data: { q: term } });
        if (cancelled) return;
        if (results.length > 0) {
          setState({
            kind: "local",
            results: results.slice(0, 10),
            reason: response.status === "error" ? "error" : "empty",
          });
          return;
        }
        setState({ kind: response.status === "error" ? "error" : "empty" });
      } catch {
        if (!cancelled) setState({ kind: response.status === "error" ? "error" : "empty" });
      }
    };

    run();
    return () => { cancelled = true; };
  }, [debounced, ctx]);

  return (
    <div className="space-y-2">
      <Label>Buscar bairro, cidade, rua ou CEP</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Ex: Nova Parnaíba, Centro, Avenida São Sebastião ou 64200-001"
          value={q}
          onChange={(e) => { setQ(e.target.value); setLastSelected(null); }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Use a busca para localizar dados pelo ViaCEP. Você poderá ajustar manualmente o bairro e a faixa de CEP antes de salvar.
      </p>

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 rounded-md border p-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando no ViaCEP…
        </div>
      )}

      {state.kind === "need-context" && (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          Informe a cidade e UF para buscar bairros e endereços pelo ViaCEP.
        </div>
      )}

      {state.kind === "empty" && (
        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          Nenhum resultado encontrado no ViaCEP. Você pode preencher os dados manualmente.
        </div>
      )}

      {state.kind === "error" && (
        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          Não foi possível consultar o ViaCEP agora. Preencha manualmente ou tente novamente.
        </div>
      )}

      {state.kind === "viacep" && state.results.length > 0 && (
        <ul className="max-h-72 overflow-auto rounded-md border divide-y">
          {state.results.map((r, i) => (
            <li key={`${r.cep}-${i}`}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => { onSelect(r); setLastSelected(r.cep); }}
              >
                <span className="font-semibold">{r.bairro || "Bairro não informado"}</span>
                <span className="text-xs text-muted-foreground">
                  {[r.logradouro, `${r.localidade}/${r.uf}`, maskCep(r.cep)].filter(Boolean).join(" — ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {state.kind === "local" && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground">
            {state.reason === "error"
              ? "ViaCEP indisponível — mostrando resultados da base local."
              : "Sem resultados no ViaCEP — mostrando resultados da base local."}
          </p>
          <ul className="max-h-72 overflow-auto rounded-md border divide-y">
            {state.results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => { onSelectLocal(r); setLastSelected(r.id); }}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {r.neighborhood || `${r.city}/${r.uf}`}
                    <Badge variant="outline" className="text-[10px]">Base local</Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.city}/{r.uf} — {maskCep(r.cep_start)} até {maskCep(r.cep_end)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lastSelected && (state.kind === "viacep" || state.kind === "local") && (
        <p className="text-[11px] text-muted-foreground">
          {state.kind === "viacep"
            ? "O ViaCEP retornou um CEP específico. Se a área de entrega cobre uma faixa maior, ajuste o CEP inicial e final."
            : "Faixa da base local aplicada. Ajuste se necessário."}
        </p>
      )}
    </div>
  );
}
