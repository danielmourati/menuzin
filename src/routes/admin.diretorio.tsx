import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Compass, Sparkles, Star, TrendingUp, ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  setDirectoryOptIn, listMyDirectoryProducts, setFreeSpotlight,
  clearDirectoryFeature, replaceSpotlightProduct,
} from "@/lib/directory-admin.functions";
import { getTenantMetrics } from "@/lib/directory.functions";
import { productImage } from "@/lib/product-image";
import { brl } from "@/lib/format";
import { createPromoRequest, listPublicHighlightPlans } from "@/lib/guia-admin.functions";
import { SLOT_KIND_LABELS, type GuiaSlotKind, type GuiaHighlightPlan } from "@/lib/guia-types";

export const Route = createFileRoute("/admin/diretorio")({
  component: DiretorioPage,
});

function DiretorioPage() {
  return (
    <AdminLayout title="Guia Menuzin">
      <div className="mx-auto max-w-5xl space-y-6">
        <OptInBlock />
        <SpotlightBlock />
        <RequestFeatureBlock />
        <ProductsBlock />
        <MetricsBlock />
      </div>
    </AdminLayout>
  );
}

function RequestFeatureBlock() {
  const { data } = useQuery({
    queryKey: ["diretorio", "my-products"],
    queryFn: () => listMyDirectoryProducts(),
  });
  const { data: highlightPlans = [] } = useQuery({
    queryKey: ["public-highlight-plans"],
    queryFn: () => listPublicHighlightPlans(),
  });

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GuiaSlotKind>("featured");
  const [days, setDays] = useState<number>(7);
  const [note, setNote] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ pixCode?: string; amount: number } | null>(null);

  const availableKinds = useMemo(
    () =>
      (Object.keys(SLOT_KIND_LABELS) as GuiaSlotKind[]).filter((k) =>
        highlightPlans.some((p) => p.slot_kind === k && p.active),
      ),
    [highlightPlans],
  );

  const availablePlans = useMemo(
    () =>
      highlightPlans
        .filter((p) => p.slot_kind === kind && p.active)
        .sort((a, b) => a.duration_days - b.duration_days),
    [highlightPlans, kind],
  );

  const selectedPlan = availablePlans.find((p) => p.duration_days === days) ?? availablePlans[0];
  const price = selectedPlan?.price ?? 0;
  const currentDays = selectedPlan?.duration_days ?? days;

  useEffect(() => {
    if (availableKinds.length && !availableKinds.includes(kind)) setKind(availableKinds[0]);
  }, [availableKinds, kind]);

  const requestMutation = useMutation({
    mutationFn: () =>
      createPromoRequest({
        data: {
          slotKind: kind,
          durationDays: currentDays,
          amount: price,
          note: note.trim() || undefined,
          productId: kind === "featured" && productId ? productId : undefined,
        },
      }),
    onSuccess: (req) => {
      setPending({ pixCode: req.pixCode, amount: req.amount });
      toast.success("Solicitação enviada. Confirme o pagamento por PIX.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => requestMutation.mutate();

  const close = () => {
    setPending(null);
    setNote("");
    setProductId(null);
    setOpen(false);
  };

  return (
    <section className="rounded-2xl border bg-gradient-to-br from-primary/5 to-fuchsia-500/5 p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <div className="rounded-xl bg-primary/10 p-3">
          <Star className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Turbinar sua loja no Guia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Listagem no Guia é sempre <strong>grátis</strong>. Este destaque é opcional e cobrado via PIX — aparece em posições privilegedadas (hero, banner, carrossel).
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Star className="mr-1 h-4 w-4" /> Solicitar destaque
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending ? "Pagamento via PIX" : "Solicitar destaque no Guia"}</DialogTitle>
          </DialogHeader>
          {pending ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Copie o código PIX abaixo e pague no seu banco. Assim que confirmarmos o pagamento, seu destaque entra no ar automaticamente.
              </p>
              <div className="rounded-xl border bg-muted p-3">
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="text-2xl font-black text-primary">{brl(pending.amount)}</p>
              </div>
              <div>
                <Label>Código PIX (copia e cola)</Label>
                <div className="mt-1 flex gap-2">
                  <Input readOnly value={pending.pixCode ?? ""} />
                  <Button variant="outline" onClick={() => {
                    if (pending.pixCode) {
                      navigator.clipboard.writeText(pending.pixCode);
                      toast.success("Copiado.");
                    }
                  }}>Copiar</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Modo demonstração: o Menuzin ainda não processa PIX real. A confirmação será feita manualmente pelo time até a integração ficar pronta.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Tipo de destaque</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as GuiaSlotKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableKinds.map((k) => (
                      <SelectItem key={k} value={k}>{SLOT_KIND_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duração</Label>
                <Select value={String(currentDays)} onValueChange={(v) => setDays(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availablePlans.map((p) => (
                      <SelectItem key={p.id} value={String(p.duration_days)}>
                        {p.duration_days} dias — {brl(p.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {kind === "featured" && (
                <div>
                  <Label>Produto a destacar</Label>
                  <ProductSearchSelect
                    products={(data?.products ?? []) as MyProduct[]}
                    value={productId}
                    onChange={setProductId}
                    placeholder="Escolha um produto do cardápio"
                  />
                </div>
              )}
              <div>
                <Label>Observação (opcional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: destacar a pizza calabresa" />
              </div>
              <div className="rounded-xl border bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-black text-primary">{brl(price)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {pending ? (
              <Button onClick={close}>Fechar</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={close}>Cancelar</Button>
                <Button onClick={submit}>Gerar PIX</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function OptInBlock() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["diretorio", "my-products"],
    queryFn: () => listMyDirectoryProducts(),
  });
  const tenant = data?.tenant ?? null;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [neighborhood, setNeighborhood] = useState("");
  const [cep, setCep] = useState("");

  const mut = useMutation({
    mutationFn: (opts: { opt_in: boolean; neighborhood?: string; cep?: string }) =>
      setDirectoryOptIn({ data: opts }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diretorio"] });
      toast.success("Preferência do Guia atualizada.");
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar."),
  });

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      mut.mutate({ opt_in: false });
      return;
    }
    if (!tenant?.neighborhood) {
      setNeighborhood(tenant?.neighborhood ?? "");
      setCep(tenant?.cep ?? "");
      setDialogOpen(true);
      return;
    }
    mut.mutate({ opt_in: true });
  };

  const submitDialog = () => {
    if (neighborhood.trim().length < 2) return toast.error("Informe o bairro.");
    if (cep && !/^\d{5}-?\d{3}$/.test(cep)) return toast.error("CEP inválido.");
    mut.mutate({ opt_in: true, neighborhood: neighborhood.trim(), cep: cep || undefined });
  };

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <div className="rounded-xl bg-primary/10 p-3">
          <Compass className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Aparecer no Guia Menuzin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua loja aparece no Guia por padrão — sem custo. Desative se preferir ocultar. O destaque em banners/carrossel exige plano Pro.
          </p>
          {tenant?.neighborhood && (
            <p className="mt-2 text-xs text-muted-foreground">
              Bairro cadastrado: <strong>{tenant.neighborhood}</strong>{tenant?.cep ? ` · CEP ${tenant.cep}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Switch checked={!!tenant?.directory_opt_in} onCheckedChange={handleToggle} disabled={mut.isPending} />
              <span className="text-sm font-medium">
                {tenant?.directory_opt_in ? "Ativo" : "Desativado"}
              </span>
            </>
          )}
        </div>
      </div>

      {tenant?.directory_opt_in && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/guia" target="_blank">
              Ver Guia público <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bairro da sua loja</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Precisamos do bairro para filtrar os clientes que estão perto de você.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Bairro *</Label>
              <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Ex.: Reis Veloso" />
            </div>
            <div>
              <Label>CEP</Label>
              <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submitDialog} disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ativar Guia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type MyProduct = {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  promo_price: number | null;
  directory_visible: boolean;
  directory_category: string | null;
  directory_featured_until: string | null;
  suggested_category: string | null;
};

function ProductSearchSelect({
  products,
  value,
  onChange,
  placeholder = "Buscar produto…",
}: {
  products: MyProduct[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p.id === value) ?? null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar produto…" />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => {
                    onChange(p.id === value ? null : p.id);
                    setOpen(false);
                  }}
                >
                  <img src={productImage(p.image_url)} alt="" className="mr-2 h-7 w-7 rounded object-cover" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{brl(p.promo_price ?? p.price)}</span>
                  {p.id === value && <Check className="ml-2 h-4 w-4 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SpotlightBlock() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["diretorio", "my-products"],
    queryFn: () => listMyDirectoryProducts(),
  });
  const now = Date.now();
  const products = (data?.products ?? []) as MyProduct[];
  const paidIds = data?.paidFeaturedIds ?? [];
  const featuredNow = products.filter(
    (p) => p.directory_featured_until && new Date(p.directory_featured_until).getTime() > now,
  );
  const freeCurrent = featuredNow.find((p) => !paidIds.includes(p.id)) ?? null;
  const [newFree, setNewFree] = useState<string | null>(null);
  const [editing, setEditing] = useState<MyProduct | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["diretorio"] });

  const saveFree = useMutation({
    mutationFn: (product_id: string | null) => setFreeSpotlight({ data: { product_id } }),
    onSuccess: () => { toast.success("Destaque atualizado."); setNewFree(null); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar."),
  });

  const removeMut = useMutation({
    mutationFn: (product_id: string) => clearDirectoryFeature({ data: { product_id } }),
    onSuccess: () => { toast.success("Destaque removido."); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao remover."),
  });

  const replaceMut = useMutation({
    mutationFn: (v: { from: string; to: string }) =>
      replaceSpotlightProduct({ data: { from_product_id: v.from, to_product_id: v.to } }),
    onSuccess: () => {
      toast.success("Produto do destaque trocado.");
      setEditing(null);
      setEditTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao trocar."),
  });

  const isFar = (iso: string) => new Date(iso).getFullYear() > 2900;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Destaques no Guia</h2>
          <p className="text-sm text-muted-foreground">
            Você tem <strong>1 destaque grátis</strong> na seção “em destaque agora”.
            Destaques adicionais são contratados via PIX e podem ser trocados de produto
            dentro do período contratado.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-4 space-y-3">
          {featuredNow.length > 0 ? (
            <div className="divide-y rounded-xl border">
              {featuredNow.map((p) => {
                const paid = paidIds.includes(p.id);
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                    <img src={productImage(p.image_url)} alt={p.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant={paid ? "default" : "secondary"} className="text-[10px]">
                          {paid ? "PIX" : "Grátis"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {isFar(p.directory_featured_until!)
                            ? "sem prazo"
                            : `até ${new Date(p.directory_featured_until!).toLocaleDateString("pt-BR")}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditing(p); setEditTarget(p.id); }}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Trocar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMut.mutate(p.id)}
                        disabled={removeMut.isPending}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              Nenhum destaque ativo no momento.
            </div>
          )}

          {!freeCurrent && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3">
              <p className="w-full text-xs font-semibold text-muted-foreground">Adicionar destaque grátis</p>
              <div className="min-w-[240px] flex-1">
                <ProductSearchSelect products={products} value={newFree} onChange={setNewFree} />
              </div>
              <Button onClick={() => saveFree.mutate(newFree)} disabled={saveFree.isPending || !newFree}>
                {saveFree.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar destaque
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setEditTarget(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar produto do destaque</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O novo produto assume o destaque de <strong>{editing?.name}</strong>, mantendo a mesma validade.
          </p>
          <ProductSearchSelect products={products} value={editTarget} onChange={setEditTarget} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditing(null); setEditTarget(null); }}>Cancelar</Button>
            <Button
              onClick={() => editing && editTarget && replaceMut.mutate({ from: editing.id, to: editTarget })}
              disabled={!editTarget || editTarget === editing?.id || replaceMut.isPending}
            >
              {replaceMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ProductsBlock() {
  const { data, isLoading } = useQuery({
    queryKey: ["diretorio", "my-products"],
    queryFn: () => listMyDirectoryProducts(),
  });
  const now = Date.now();
  const catLabel = (slug: string | null) =>
    data?.guiaCategories.find((c) => c.slug === slug)?.label ?? slug ?? "";

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Star className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Produtos publicados no Guia</h2>
          <p className="text-sm text-muted-foreground">
            Lista somente para consulta. A publicação é automática e a categoria vem do seu cardápio.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (data?.products.length ?? 0) === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Cadastre produtos em <Link to="/admin/produtos" className="text-primary underline">Produtos</Link> para publicá-los aqui.
        </div>
      ) : (
        <div className="mt-4 divide-y rounded-xl border">
          {(data!.products as MyProduct[]).map((p) => {
            const isFeatured = !!p.directory_featured_until && new Date(p.directory_featured_until).getTime() > now;
            const effectiveCategory = p.directory_category ?? p.suggested_category ?? null;
            const invalidCat =
              !!p.directory_category &&
              !(data?.guiaCategories.some((c) => c.slug === p.directory_category) ?? false);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                <img src={productImage(p.image_url)} alt={p.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{brl(p.promo_price ?? p.price)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {effectiveCategory && !invalidCat && (
                      <Badge variant="secondary" className="text-[10px]">{catLabel(effectiveCategory)}</Badge>
                    )}
                    {invalidCat && (
                      <Badge variant="destructive" className="text-[10px]">categoria removida</Badge>
                    )}
                    {isFeatured && (
                      <Badge className="text-[10px]"><Star className="mr-1 h-2.5 w-2.5 fill-current" /> em destaque</Badge>
                    )}
                  </div>
                </div>

                <Badge variant={p.directory_visible ? "secondary" : "outline"} className="text-[10px]">
                  {p.directory_visible ? "Publicado" : "Oculto"}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}



function MetricsBlock() {
  const { data, isLoading } = useQuery({
    queryKey: ["diretorio", "metrics"],
    queryFn: () => getTenantMetrics({ data: {} }),
  });
  const max = Math.max(1, ...(data?.days.map((d) => d.count) ?? [0]));

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Cliques no Guia (últimos 30 dias)</h2>
          <p className="text-sm text-muted-foreground">
            {data ? (
              <>Total: <strong>{data.total}</strong> · WhatsApp: <strong>{data.totalWhatsapp}</strong> · Loja: <strong>{data.totalStorefront}</strong></>
            ) : "Carregando…"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="mt-4 flex h-32 items-end gap-1 rounded-xl border bg-muted/30 p-3">
            {data!.days.map((d) => (
              <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-0.5">
                <div
                  className="w-full rounded-t bg-primary/80 transition group-hover:bg-primary"
                  style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 2 : 0 }}
                  title={`${d.date}: ${d.count} cliques`}
                />
              </div>
            ))}
          </div>

          {data!.top.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold">Top produtos por cliques</h3>
              <ol className="space-y-1.5">
                {data!.top.map((t, i) => (
                  <li key={t.product_id} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
                    <span className="w-5 text-muted-foreground">{i + 1}.</span>
                    <span className="flex-1 truncate">{t.name}</span>
                    <span className="font-semibold">{t.count}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}
