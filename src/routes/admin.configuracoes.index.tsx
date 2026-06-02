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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMyTenant, updateMyTenant } from "@/lib/tenants.functions";
import { maskPhone } from "@/lib/masks";

export const Route = createFileRoute("/admin/configuracoes/")({ component: SettingsPage });

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

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
};

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
  });
  const tenant = data?.tenant;

  const [form, setForm] = useState<FormState>({
    name: "", whatsapp: "", description: "", address: "", city: "", state: "",
    delivery_fee: 0, min_order: 0, prep_time: "", pos_paper_width: "80mm",
  });

  useEffect(() => {
    if (!tenant) return;
    const t = tenant as typeof tenant & { pos_paper_width?: string };
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
    });
  }, [tenant]);

  const saveMut = useMutation({
    mutationFn: () => updateMyTenant({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tenant"] });
      toast.success("Configurações salvas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const publicLink = tenant?.slug ? `${window.location.host}/${tenant.slug}` : "";

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
            </TabsContent>

            <TabsContent value="horarios" className="mt-6 space-y-2">
              {days.map((d) => (
                <div key={d} className="grid items-center gap-3 rounded-xl border p-3 sm:grid-cols-[120px_auto_1fr_1fr]">
                  <span className="font-medium">{d}</span>
                  <Switch defaultChecked />
                  <Input type="time" defaultValue="18:00" />
                  <Input type="time" defaultValue="23:00" />
                </div>
              ))}
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

            <TabsContent value="entrega" className="mt-6 grid gap-3 md:grid-cols-2">
              <Row label="Aceita entrega" value={true} />
              <Row label="Aceita retirada" value={true} />
              <Row label="Aceita consumo no local" value={true} />
              <div><Label>Taxa de entrega</Label><Input type="number" value={form.delivery_fee} onChange={(e) => set("delivery_fee", Number(e.target.value))} className="mt-1.5" /></div>
              <div><Label>Pedido mínimo</Label><Input type="number" value={form.min_order} onChange={(e) => set("min_order", Number(e.target.value))} className="mt-1.5" /></div>
              <div><Label>Tempo médio de preparo</Label><Input value={form.prep_time} onChange={(e) => set("prep_time", e.target.value)} className="mt-1.5" /></div>
              <div className="md:col-span-2">
                <Label>Largura do papel térmico (POS)</Label>
                <div className="mt-2 flex gap-2">
                  {(["55mm", "80mm"] as const).map((w) => (
                    <Button
                      key={w}
                      type="button"
                      variant={form.pos_paper_width === w ? "default" : "outline"}
                      onClick={() => set("pos_paper_width", w)}
                    >
                      {w}
                    </Button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Define o layout do cupom impresso de pedidos.
                </p>
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
