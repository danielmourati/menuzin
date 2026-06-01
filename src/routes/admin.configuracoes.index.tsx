import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { store } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes/")({ component: SettingsPage });

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function SettingsPage() {
  const [pix, setPix] = useState(true);
  const [dinheiro, setDinheiro] = useState(true);
  const [credito, setCredito] = useState(true);
  const [debito, setDebito] = useState(true);
  const save = () => toast.success("Configurações salvas");

  return (
    <AdminLayout title="Configurações" action={<Button onClick={save}>Salvar</Button>}>
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
            <div><Label>Nome da loja</Label><Input defaultValue={store.name} className="mt-1.5" /></div>
            <div><Label>WhatsApp</Label><Input defaultValue={store.whatsapp} className="mt-1.5" /></div>
            <div className="md:col-span-2"><Label>Descrição</Label><Textarea defaultValue={store.description} className="mt-1.5" /></div>
            <div><Label>Endereço</Label><Input defaultValue={store.address} className="mt-1.5" /></div>
            <div><Label>Cidade/UF</Label><Input defaultValue={`${store.city}/${store.state}`} className="mt-1.5" /></div>
            <div><Label>CEP</Label><Input placeholder="00000-000" className="mt-1.5" /></div>
            <div><Label>Telefone</Label><Input placeholder="(00) 0000-0000" className="mt-1.5" /></div>
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
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold tracking-tight">Nova Central de Pagamentos</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Aprimoramos o sistema de pagamentos! Agora você pode conectar sua própria conta do <strong>Mercado Pago</strong> com checkout transparente e configurar todos os métodos manuais no mesmo lugar.
                </p>
              </div>
              <div className="pt-2">
                <Button asChild className="h-11 px-6 rounded-xl font-semibold">
                  <Link to="/admin/configuracoes/pagamentos">
                    Configurar Métodos de Pagamento e Mercado Pago
                  </Link>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pedidos" className="mt-6 space-y-4">
            <div className="rounded-2xl border bg-card p-6 shadow-sm max-w-2xl mx-auto text-center space-y-4">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold tracking-tight">Alertas de Pedidos em Tempo Real</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Configure alertas sonoros, notificações flutuantes na tela (toasts) e destaque visual para novos pedidos para garantir que nenhum cliente fique esperando.
                </p>
              </div>
              <div className="pt-2">
                <Button asChild className="h-11 px-6 rounded-xl font-semibold">
                  <Link to="/admin/configuracoes/pedidos">
                    Configurar Alertas e Notificações
                  </Link>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="entrega" className="mt-6 grid gap-3 md:grid-cols-2">
            <Row label="Aceita entrega" value={true} />
            <Row label="Aceita retirada" value={true} />
            <Row label="Aceita consumo no local" value={true} />
            <div><Label>Taxa de entrega</Label><Input type="number" defaultValue={store.deliveryFee} className="mt-1.5" /></div>
            <div><Label>Pedido mínimo</Label><Input type="number" defaultValue={store.minOrder} className="mt-1.5" /></div>
            <div><Label>Tempo médio de preparo</Label><Input defaultValue={store.prepTime} className="mt-1.5" /></div>
          </TabsContent>

          <TabsContent value="redes" className="mt-6 grid gap-3 md:grid-cols-2">
            <div><Label>Instagram</Label><Input placeholder="@suamarca" className="mt-1.5" /></div>
            <div><Label>Facebook</Label><Input placeholder="/suamarca" className="mt-1.5" /></div>
            <div><Label>TikTok</Label><Input placeholder="@suamarca" className="mt-1.5" /></div>
            <div><Label>Site</Label><Input placeholder="https://" className="mt-1.5" /></div>
          </TabsContent>

          <TabsContent value="link" className="mt-6">
            <Label>Link público da sua loja</Label>
            <div className="mt-1.5 flex gap-2">
              <Input readOnly value={`foodcatalogo.app/loja/${store.slug}`} />
              <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(`foodcatalogo.app/loja/${store.slug}`); toast.success("Copiado"); }}>Copiar</Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent></Card>
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
