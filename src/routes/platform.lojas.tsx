import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, ExternalLink, Loader2, Pencil, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  listPlatformStores,
  adminUpdateTenant,
  adminDeleteTenant,
  adminGetTenantOwner,
  adminUpdateTenantOwner,
  adminApplyTenantTemplate,
  adminApplyTemplateToAll,
  type PlatformStoreRow,
} from "@/lib/platform.functions";
import { PLAN_LABEL, normalizePlan, type TenantPlan } from "@/lib/plan-features";
import { brl } from "@/lib/format";
import { PlatformLayout } from "./platform.dashboard";
import { useAuth } from "@/lib/auth-context";
import { setActiveTenantId } from "@/lib/active-tenant";
import { BUSINESS_TYPES, BUSINESS_TYPE_LABELS, type BusinessType } from "@/lib/business-types";
import { BusinessTypesField } from "@/components/admin/BusinessTypesField";

export const Route = createFileRoute("/platform/lojas")({ component: PlatformStores });

const statusTone: Record<string, string> = {
  ativa: "bg-success/15 text-success",
  teste: "bg-warning/20 text-warning-foreground",
  suspensa: "bg-destructive/15 text-destructive",
};

function PlatformStores() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const accessStore = (id: string) => {
    setActiveTenantId(id);
    qc.invalidateQueries();
    navigate({ to: "/admin/dashboard" });
  };
  const { isPlatformAdmin, loading: authLoading } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "stores"],
    queryFn: () => listPlatformStores(),
    enabled: !authLoading && isPlatformAdmin,
  });
  const stores = data?.stores ?? [];

  const [editing, setEditing] = useState<PlatformStoreRow | null>(null);
  const [deleting, setDeleting] = useState<PlatformStoreRow | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => adminDeleteTenant({ data: { id } }),
    onSuccess: () => {
      toast.success("Loja excluída.");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyOneMut = useMutation({
    mutationFn: (id: string) => adminApplyTenantTemplate({ data: { tenant_id: id } }),
    onSuccess: (r) => {
      toast.success(
        `Padronizado com base em ${r.template_slug}. ${r.updated_fields.length} campo(s), ${r.created.length} registro(s) novos.`,
      );
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyAllMut = useMutation({
    mutationFn: () => adminApplyTemplateToAll(),
    onSuccess: (r) => {
      const ok = r.results.filter((x) => x.ok).length;
      const fail = r.results.length - ok;
      toast.success(`Padronização concluída: ${ok} ok${fail ? `, ${fail} com erro` : ""}.`);
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PlatformLayout title="Lojas">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {stores.length} estabelecimentos cadastrados
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => applyAllMut.mutate()}
            disabled={applyAllMut.isPending}
            title="Aplica o template padrão (burgerprime/vilaboemia) em todas as lojas, sem sobrescrever dados existentes"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {applyAllMut.isPending ? "Padronizando..." : "Padronizar todas"}
          </Button>
          <Button asChild>
            <Link to="/platform/tenants/novo">+ Novo estabelecimento</Link>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <p className="rounded-xl border bg-destructive/10 p-4 text-destructive">
          {(error as Error).message}
        </p>
      )}

      <div className="grid gap-6">
        {!isLoading && !error && stores.length === 0 && (
          <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            Nenhuma loja cadastrada.
          </p>
        )}
        {(() => {
          if (isLoading || error || stores.length === 0) return null;
          const groups = new Map<string, PlatformStoreRow[]>();
          for (const s of stores) {
            const types = s.business_types && s.business_types.length > 0 ? s.business_types : ["__none__"];
            for (const t of types) {
              const arr = groups.get(t) ?? [];
              arr.push(s);
              groups.set(t, arr);
            }
          }
          const order = [...BUSINESS_TYPES as readonly string[], "__none__"];
          const sorted = order.filter((k) => groups.has(k));
          return sorted.map((key) => {
            const list = groups.get(key)!;
            const label = key === "__none__" ? "Sem categoria" : BUSINESS_TYPE_LABELS[key as BusinessType];
            return (
              <section key={key} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{label}</h2>
                  <span className="text-xs text-muted-foreground">({list.length})</span>
                </div>
                <div className="grid gap-3">
                  {list.map((s) => (
                    <Card key={`${key}-${s.id}`}>
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold">{s.name}</p>
                            <Badge variant="secondary" className={statusTone[s.status] ?? ""}>
                              {s.status}
                            </Badge>
                            <Badge variant="outline">{PLAN_LABEL[normalizePlan(s.plan)]}</Badge>
                            {s.business_types?.map((bt) => (
                              <Badge key={bt} variant="outline" className="bg-primary/5 text-primary border-primary/30">
                                {BUSINESS_TYPE_LABELS[bt as BusinessType] ?? bt}
                              </Badge>
                            ))}
                            {!s.active && <Badge variant="destructive">inativa</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {s.city}
                            {s.state ? `/${s.state}` : ""} · /{s.slug} · cadastrada em{" "}
                            {new Date(s.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right pr-2">
                            <p className="text-sm">{s.orders_month} pedidos (30d)</p>
                            <p className="text-xs text-muted-foreground">{brl(s.revenue_month)}</p>
                          </div>
                          <Button asChild size="icon" variant="outline" title="Abrir loja">
                            <Link to="/$slug" params={{ slug: s.slug }} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="outline" title="Acessar painel desta loja" onClick={() => accessStore(s.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="Aplicar template padrão (não sobrescreve)"
                            onClick={() => applyOneMut.mutate(s.id)}
                            disabled={applyOneMut.isPending}
                          >
                            <Wand2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" title="Editar" onClick={() => setEditing(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="Excluir"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleting(s)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          });
        })()}
      </div>


      {editing && (
        <EditTenantDialog
          store={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["platform"] });
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir loja "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. Todos os produtos, categorias, pedidos e
              vínculos de usuários desta loja serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={delMut.isPending}
              onClick={() => deleting && delMut.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {delMut.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PlatformLayout>
  );
}

function EditTenantDialog({
  store,
  onClose,
  onSaved,
}: {
  store: PlatformStoreRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(store.name);
  const [slug, setSlug] = useState(store.slug);
  const [city, setCity] = useState(store.city ?? "");
  const [state, setState] = useState(store.state ?? "");
  const [plan, setPlan] = useState<TenantPlan>(normalizePlan(store.plan));
  const [status, setStatus] = useState<string>(store.status);
  const [active, setActive] = useState<boolean>(store.active);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>(
    (store.business_types ?? []) as BusinessType[],
  );

  const mut = useMutation({
    mutationFn: () =>
      adminUpdateTenant({
        data: {
          id: store.id,
          name,
          slug,
          city,
          state,
          plan,
          status: status as "ativa" | "teste" | "suspensa",
          active,
          business_types: businessTypes,
        },
      }),
    onSuccess: () => {
      toast.success("Loja atualizada.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Editar loja</DialogTitle>
          <DialogDescription>Atualize os dados deste estabelecimento.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 overflow-y-auto px-6 py-4 flex-1">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Slug (endereço)</Label>
            <Input
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              menuzin.com.br/<span className="font-mono">{slug}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label>UF</Label>
              <Input
                value={state}
                maxLength={2}
                onChange={(e) => setState(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plano</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as TenantPlan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presenca">Presença</SelectItem>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="teste">Em teste</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Loja ativa</p>
              <p className="text-xs text-muted-foreground">
                Quando desligada, fica fora do ar publicamente.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <OwnerEditor tenantId={store.id} />
        </div>
        <DialogFooter className="px-6 pb-6 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OwnerEditor({ tenantId }: { tenantId: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["platform", "tenant-owner", tenantId],
    queryFn: () => adminGetTenantOwner({ data: { tenant_id: tenantId } }),
  });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (!data) return;
    setFullName(data.full_name ?? "");
    setEmail(data.email ?? "");
  }, [data]);

  const hasOwner = !!data?.user_id;
  const mut = useMutation({
    mutationFn: () => {
      const payload: {
        tenant_id: string;
        full_name?: string;
        email?: string;
        new_password?: string;
        create_if_missing?: boolean;
      } = { tenant_id: tenantId };
      if (fullName) payload.full_name = fullName;
      if (email && email !== (data?.email ?? "")) payload.email = email;
      if (!hasOwner && email) payload.email = email;
      if (pw) payload.new_password = pw;
      if (!hasOwner) payload.create_if_missing = true;
      return adminUpdateTenantOwner({ data: payload });
    },
    onSuccess: (r) => {
      toast.success(r.created ? "Administrador criado." : "Administrador atualizado.");
      setPw("");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Administrador da loja</p>
        {!hasOwner && !isLoading && (
          <span className="text-xs text-warning">Nenhum admin vinculado</span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Nome completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">E-mail de acesso</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">
            {hasOwner ? "Nova senha (opcional)" : "Senha inicial"}
          </Label>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder={hasOwner ? "Deixe em branco para manter" : "Defina a senha inicial"}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Salvando..." : hasOwner ? "Atualizar admin" : "Criar admin"}
        </Button>
      </div>
    </div>
  );
}
