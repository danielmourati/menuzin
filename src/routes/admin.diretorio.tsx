import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Compass, Star, TrendingUp, ExternalLink, Loader2 } from "lucide-react";
import {
  setDirectoryOptIn, listMyDirectoryProducts, updateDirectoryProduct,
  featureDirectoryProduct, clearDirectoryFeature,
} from "@/lib/directory-admin.functions";
import { getTenantMetrics, DIRECTORY_CATEGORIES } from "@/lib/directory.functions";
import { productImage } from "@/lib/product-image";
import { brl } from "@/lib/format";
import { guiaActions, SLOT_KIND_LABELS, SLOT_KIND_PRICES, type GuiaSlotKind } from "@/lib/guia-mock";

export const Route = createFileRoute("/admin/diretorio")({
  component: DiretorioPage,
});

function DiretorioPage() {
  return (
    <AdminLayout title="Guia Menuzin">
      <div className="mx-auto max-w-5xl space-y-6">
        <OptInBlock />
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
  const tenantName = data?.tenant?.name ?? "Sua loja";
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GuiaSlotKind>("featured");
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<{ pixCode?: string; amount: number } | null>(null);
  const price = SLOT_KIND_PRICES[kind][days];

  const submit = () => {
    const req = guiaActions.createRequest({
      tenantName,
      slotKind: kind,
      durationDays: days,
      amount: price,
      note: note.trim() || undefined,
    });
    setPending({ pixCode: req.pixCode, amount: req.amount });
    toast.success("Solicitação enviada. Confirme o pagamento por PIX.");
  };

  const close = () => {
    setPending(null);
    setNote("");
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
            Listagem no Guia é sempre <strong>grátis</strong>. Este destaque é opcional e cobrado via PIX — aparece em posições privilegiadas (hero, banner, carrossel).
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
                    {(Object.keys(SLOT_KIND_LABELS) as GuiaSlotKind[]).map((k) => (
                      <SelectItem key={k} value={k}>{SLOT_KIND_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duração</Label>
                <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as 7 | 14 | 30)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias — {brl(SLOT_KIND_PRICES[kind][7])}</SelectItem>
                    <SelectItem value="14">14 dias — {brl(SLOT_KIND_PRICES[kind][14])}</SelectItem>
                    <SelectItem value="30">30 dias — {brl(SLOT_KIND_PRICES[kind][30])}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

function ProductsBlock() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["diretorio", "my-products"],
    queryFn: () => listMyDirectoryProducts(),
  });
  const tenant = data?.tenant;
  const isPro = tenant?.plan === "pro";
  const now = Date.now();

  const updateMut = useMutation({
    mutationFn: (p: { product_id: string; directory_visible?: boolean; directory_category?: string | null }) =>
      updateDirectoryProduct({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diretorio"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar."),
  });
  const featureMut = useMutation({
    mutationFn: (product_id: string) => featureDirectoryProduct({ data: { product_id, days: 7 } }),
    onSuccess: () => { toast.success("Produto em destaque por 7 dias 🎉"); qc.invalidateQueries({ queryKey: ["diretorio"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao destacar."),
  });
  const clearMut = useMutation({
    mutationFn: (product_id: string) => clearDirectoryFeature({ data: { product_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diretorio"] }),
  });

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Star className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Produtos publicados no Guia</h2>
          <p className="text-sm text-muted-foreground">
            Escolha uma categoria para cada produto e ative o Guia. {isPro ? "Destaque incluso no plano Pro." : "Destaque disponível no plano Pro."}
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
          {data!.products.map((p) => {
            const isFeatured = p.directory_featured_until && new Date(p.directory_featured_until).getTime() > now;
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                <img src={productImage(p.image_url)} alt={p.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{brl(p.promo_price ?? p.price)}</p>
                </div>
                <div className="w-40">
                  <Select
                    value={p.directory_category ?? ""}
                    onValueChange={(v) => updateMut.mutate({ product_id: p.id, directory_category: v || null })}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                      {DIRECTORY_CATEGORIES.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>{c.emoji} {c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.directory_visible}
                    onCheckedChange={(v) => updateMut.mutate({ product_id: p.id, directory_visible: v })}
                  />
                  <span className="text-xs">{p.directory_visible ? "Publicado" : "Oculto"}</span>
                </div>
                {isPro ? (
                  isFeatured ? (
                    <Button size="sm" variant="outline" onClick={() => clearMut.mutate(p.id)}>
                      Remover destaque
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => featureMut.mutate(p.id)} disabled={!p.directory_visible}>
                      <Star className="mr-1 h-3 w-3" /> Destacar 7 dias
                    </Button>
                  )
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/admin/assinatura">Destaque no Pro</Link>
                  </Button>
                )}
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
