import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Plus, Edit2, Trash2, Loader2, MapPin, Ban, DollarSign, Map as MapIcon, Check } from "lucide-react";
import { toast } from "sonner";
import {
  listMyDeliveryZones, upsertDeliveryZone, deleteDeliveryZone,
  type DeliveryZoneRow,
} from "@/lib/delivery-zones.functions";
import { getMyTenant, updateMyTenant } from "@/lib/tenants.functions";
import { searchCepRanges, type CepRangeResult } from "@/lib/cep-ranges.functions";
import { brl } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/taxas-entrega")({
  component: DeliveryZonesPage,
});

type Mode = "none" | "single" | "neighborhood";

type Editing = {
  id?: string;
  neighborhood: string;
  fee: number;
  min_order_total: number;
  estimated_minutes: number | null;
  cep_start: string;
  cep_end: string;
  active: boolean;
};

const empty = (): Editing => ({
  neighborhood: "",
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
          active: !z.active,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "delivery-zones"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = data ?? [];

  const openNew = () => { setEditing(empty()); setOpen(true); };
  const openEdit = (z: DeliveryZoneRow) => {
    setEditing({
      id: z.id,
      neighborhood: z.neighborhood,
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
              Busque pelo nome do bairro (ou por cidade, UF ou CEP) para preencher automaticamente os campos. Você ainda pode ajustar tudo manualmente.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 overflow-y-auto -mx-6 px-6 flex-1 min-h-0">
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
              <div>
                <Label>Buscar bairro, cidade ou CEP</Label>
                <CepRangeSearch
                  onSelect={(r) =>
                    setEditing((prev) => {
                      if (!prev) return prev;
                      const next: Editing = {
                        ...prev,
                        cep_start: maskCep(r.cep_start),
                        cep_end: maskCep(r.cep_end),
                      };
                      if (r.neighborhood && !prev.neighborhood.trim()) {
                        next.neighborhood = r.neighborhood;
                      }
                      return next;
                    })
                  }
                />
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

function CepRangeSearch({ onSelect }: { onSelect: (r: CepRangeResult) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<CepRangeResult | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["cep-ranges", debounced],
    queryFn: async () => (await searchCepRanges({ data: { q: debounced } })).results,
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  const results = data ?? [];

  return (
    <div className="mt-1.5 space-y-1.5">
      <Popover open={open && debounced.length >= 2} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Digite o bairro, cidade ou CEP"
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); setPicked(null); }}
              onFocus={() => setOpen(true)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {isFetching ? (
            <div className="p-3 text-xs text-muted-foreground">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              Nenhum bairro encontrado. Você pode preencher os dados manualmente.
            </div>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => { onSelect(r); setPicked(r); setOpen(false); }}
                  >
                    {r.neighborhood ? (
                      <>
                        <span className="font-semibold">{r.neighborhood}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.city}/{r.uf} — {maskCep(r.cep_start)} até {maskCep(r.cep_end)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">{r.city}/{r.uf}</span>
                        <span className="text-xs text-muted-foreground">
                          Faixa geral da cidade — {maskCep(r.cep_start)} até {maskCep(r.cep_end)}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
      {picked && (
        <p className="text-[11px] text-muted-foreground">
          {picked.neighborhood ? (
            <>Bairro <strong>{picked.neighborhood}</strong> aplicado. Você pode ajustar os CEPs abaixo.</>
          ) : (
            <>Faixa de <strong>{picked.city}/{picked.uf}</strong> aplicada. Informe o nome do bairro ou área de entrega.</>
          )}
        </p>
      )}
    </div>
  );
}
