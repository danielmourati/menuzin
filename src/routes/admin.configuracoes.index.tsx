import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, PartyPopper, ArrowRight, Rocket } from "lucide-react";
import { toast } from "sonner";
import { getMyTenant, updateMyTenant } from "@/lib/tenants.functions";
import { getMyAdminAccount, updateMyAdminAccount } from "@/lib/account.functions";
import {
  defaultSchedule,
  normalizeSchedule,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type HoursSchedule,
  type WeekdayCode,
} from "@/lib/store-hours";


export const Route = createFileRoute("/admin/configuracoes/")({ component: SettingsPage });


type FormState = {
  name: string;
  whatsapp: string;
  description: string;
  address: string;
  city: string;
  state: string;
  delivery_fee: number;
  min_order: number;
  prep_time: string;
  pos_paper_width: "55mm" | "80mm";
  hours_schedule: HoursSchedule;
  accepts_delivery: boolean;
  accepts_takeout: boolean;
  accepts_dinein: boolean;
};

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
  });
  const tenant = data?.tenant;

  // Onboarding: vindo do cadastro rápido em /comece-agora
  const [onboarding, setOnboarding] = useState(false);
  const [nextStepOpen, setNextStepOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("onboarding") === "1") setOnboarding(true);
  }, []);


  const [form, setForm] = useState<FormState>({
    name: "", whatsapp: "", description: "", address: "", city: "", state: "",
    delivery_fee: 0, min_order: 0, prep_time: "", pos_paper_width: "80mm",
    hours_schedule: defaultSchedule(),
    accepts_delivery: true, accepts_takeout: true, accepts_dinein: true,
  });

  useEffect(() => {
    if (!tenant) return;
    const t = tenant as typeof tenant & {
      pos_paper_width?: string;
      hours_schedule?: unknown;
      accepts_delivery?: boolean;
      accepts_takeout?: boolean;
      accepts_dinein?: boolean;
    };
    const sched = normalizeSchedule(t.hours_schedule);
    setForm({
      name: tenant.name ?? "",
      whatsapp: tenant.whatsapp ?? "",
      description: tenant.description ?? "",
      address: tenant.address ?? "",
      city: tenant.city ?? "",
      state: tenant.state ?? "",
      delivery_fee: Number(tenant.delivery_fee ?? 0),
      min_order: Number(tenant.min_order ?? 0),
      prep_time: tenant.prep_time ?? "",
      pos_paper_width: (t.pos_paper_width === "55mm" ? "55mm" : "80mm"),
      hours_schedule: sched.some((d) => d.enabled) ? sched : defaultSchedule(),
      accepts_delivery: t.accepts_delivery ?? true,
      accepts_takeout: t.accepts_takeout ?? true,
      accepts_dinein: t.accepts_dinein ?? true,
    });
  }, [tenant]);


  const saveMut = useMutation({
    mutationFn: () => updateMyTenant({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tenant"] });
      toast.success("Configurações salvas");
      if (onboarding) setNextStepOpen(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const publicLink = tenant?.slug ? `https://menuzin.app/${tenant.slug}` : "";

  return (
    <AdminLayout
      title="Configurações"
      action={
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !tenant}>
          {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      }
    >
      {onboarding && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-orange-100/40 p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Bem-vindo(a) ao Menuzin!</p>
            <p className="text-sm text-muted-foreground">
              Complete os dados da sua loja aqui embaixo e clique em <strong>Salvar</strong>. Depois vamos montar seu cardápio.
            </p>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card><CardContent className="p-4">
          <Tabs defaultValue="dados">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="horarios">Horários</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
              <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
              <TabsTrigger value="impressora">Impressora</TabsTrigger>
              <TabsTrigger value="entrega">Entrega</TabsTrigger>
              <TabsTrigger value="redes">Redes sociais</TabsTrigger>
              <TabsTrigger value="link">Link público</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-6 grid gap-4 md:grid-cols-2">
              <div><Label>Nome da loja</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5" /></div>
              <div>
                <Label>WhatsApp</Label>
                <div className="mt-1.5 flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">+55</span>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
                    placeholder="DDD + número"
                    inputMode="numeric"
                    maxLength={11}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <div className="md:col-span-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Endereço</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1.5" /></div>
              <div><Label>UF</Label><Input value={form.state} onChange={(e) => set("state", e.target.value)} className="mt-1.5" /></div>
              <div className="md:col-span-2">
                <AdminAccountCard />
              </div>
            </TabsContent>

            <TabsContent value="horarios" className="mt-6 space-y-3">
              <p className="text-xs text-muted-foreground">
                Horário no fuso de Brasília. Quando o toggle do cabeçalho está em
                <strong> Auto</strong>, a loja abre e fecha sozinha conforme estes
                horários.
              </p>
              {WEEKDAY_ORDER.map((w) => {
                const day =
                  form.hours_schedule.find((d) => d.weekday === w) ??
                  { weekday: w, enabled: false, open: "18:00", close: "23:00" };
                const update = (patch: Partial<typeof day>) => {
                  setForm((p) => ({
                    ...p,
                    hours_schedule: WEEKDAY_ORDER.map((wd) => {
                      const existing =
                        p.hours_schedule.find((d) => d.weekday === wd) ??
                        { weekday: wd, enabled: false, open: "18:00", close: "23:00" };
                      return wd === w ? { ...existing, ...patch } : existing;
                    }),
                  }));
                };
                return (
                  <div
                    key={w}
                    className="grid items-center gap-3 rounded-xl border p-3 sm:grid-cols-[120px_auto_1fr_1fr]"
                  >
                    <span className="font-medium">{WEEKDAY_LABELS[w as WeekdayCode]}</span>
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(v) => update({ enabled: !!v })}
                    />
                    <Input
                      type="time"
                      value={day.open}
                      disabled={!day.enabled}
                      onChange={(e) => update({ open: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={day.close}
                      disabled={!day.enabled}
                      onChange={(e) => update({ close: e.target.value })}
                    />
                  </div>
                );
              })}
            </TabsContent>


            <TabsContent value="pagamento" className="mt-6 space-y-4">
              <div className="rounded-2xl border bg-card p-6 shadow-sm max-w-2xl mx-auto text-center space-y-4">
                <h3 className="text-lg font-bold tracking-tight">Central de Pagamentos</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Conecte sua conta do <strong>Mercado Pago</strong> com checkout transparente e configure métodos manuais.
                </p>
                <div className="pt-2">
                  <Button asChild className="h-11 px-6 rounded-xl font-semibold">
                    <Link to="/admin/configuracoes/pagamentos">Configurar pagamentos</Link>
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pedidos" className="mt-6 space-y-4">
              <div className="rounded-2xl border bg-card p-6 shadow-sm max-w-2xl mx-auto text-center space-y-4">
                <h3 className="text-lg font-bold tracking-tight">Alertas de pedidos em tempo real</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Configure alertas sonoros e notificações para novos pedidos.
                </p>
                <div className="pt-2">
                  <Button asChild className="h-11 px-6 rounded-xl font-semibold">
                    <Link to="/admin/configuracoes/pedidos">Configurar alertas</Link>
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="impressora" className="mt-6 space-y-4">
              <div className="rounded-2xl border bg-card p-6 shadow-sm max-w-2xl mx-auto text-center space-y-4">
                <h3 className="text-lg font-bold tracking-tight">Impressora de Cupom</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Configure sua impressora térmica não fiscal (55mm ou 80mm), Bluetooth, USB ou rede,
                  com perfis ESC/POS para mini impressoras e modelos ELGIN i8/i9.
                </p>
                <div className="pt-2">
                  <Button asChild className="h-11 px-6 rounded-xl font-semibold">
                    <Link to="/admin/configuracoes/impressora">Configurar impressora</Link>
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="entrega" className="mt-6 grid gap-3 md:grid-cols-2">
              <Row label="Aceita entrega" value={form.accepts_delivery} onChange={(v) => set("accepts_delivery", v)} />
              <Row label="Aceita retirada" value={form.accepts_takeout} onChange={(v) => set("accepts_takeout", v)} />
              <Row label="Aceita consumo no local" value={form.accepts_dinein} onChange={(v) => set("accepts_dinein", v)} />
              <div>
                <Label>Pedido mínimo</Label>
                <CurrencyInput value={form.min_order} onChange={(v) => set("min_order", v)} className="mt-1.5" />
              </div>
              <div className="md:col-span-2">
                <Label>Tempo médio de preparo</Label>
                <Input value={form.prep_time} onChange={(e) => set("prep_time", e.target.value)} className="mt-1.5" />
              </div>
            </TabsContent>

            <TabsContent value="redes" className="mt-6 grid gap-3 md:grid-cols-2">
              <div><Label>Instagram</Label><Input placeholder="@suamarca" className="mt-1.5" /></div>
              <div><Label>Facebook</Label><Input placeholder="/suamarca" className="mt-1.5" /></div>
            </TabsContent>

            <TabsContent value="link" className="mt-6">
              <Label>Link público da sua loja</Label>
              <div className="mt-1.5 flex gap-2">
                <Input readOnly value={publicLink} />
                <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(publicLink); toast.success("Copiado"); }}>Copiar</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent></Card>
      )}

      <Dialog open={nextStepOpen} onOpenChange={setNextStepOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Rocket className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Loja configurada!</DialogTitle>
            <DialogDescription className="text-center">
              Agora vamos cadastrar seus primeiros produtos com o assistente guiado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-col sm:gap-2 sm:space-x-0">
            <Button
              className="w-full gap-2"
              onClick={() => {
                setNextStepOpen(false);
                window.location.href = "/admin/cardapio/novo?onboarding=1";
              }}
            >
              <PartyPopper className="h-4 w-4" /> Montar meu cardápio agora
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setNextStepOpen(false)}>
              Fazer isso depois
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange?: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-3">
      <Label>{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function AdminAccountCard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-admin-account"],
    queryFn: () => getMyAdminAccount(),
  });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (!data) return;
    setFullName(data.full_name ?? "");
    setEmail(data.email ?? "");
  }, [data]);

  const mut = useMutation({
    mutationFn: () => {
      const payload: { full_name?: string; email?: string; new_password?: string } = {};
      if (fullName && fullName !== (data?.full_name ?? "")) payload.full_name = fullName;
      if (email && email !== (data?.email ?? "")) payload.email = email;
      if (pw) payload.new_password = pw;
      if (Object.keys(payload).length === 0) throw new Error("Nada para atualizar.");
      return updateMyAdminAccount({ data: payload });
    },
    onSuccess: () => {
      toast.success("Dados do administrador atualizados.");
      setPw("");
      qc.invalidateQueries({ queryKey: ["my-admin-account"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border bg-card p-4 mt-2">
      <div className="mb-3">
        <h3 className="text-base font-bold">Dados do administrador</h3>
        <p className="text-xs text-muted-foreground">
          Atualize o nome, e-mail de acesso e senha do seu usuário.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Nome completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>E-mail de acesso</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
        </div>
        <div className="md:col-span-2">
          <Label>Nova senha (opcional)</Label>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Deixe em branco para manter a atual"
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Mín. 8 caracteres, com maiúscula, minúscula, número e caractere especial.
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar dados do administrador
        </Button>
      </div>
    </div>
  );
}

