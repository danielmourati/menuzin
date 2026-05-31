import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/admin/configuracoes")({ component: SettingsPage });

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

          <TabsContent value="pagamento" className="mt-6 space-y-3">
            <Row label="Dinheiro" value={dinheiro} onChange={setDinheiro} />
            <Row label="Pix" value={pix} onChange={setPix} />
            <Row label="Cartão de crédito na entrega" value={credito} onChange={setCredito} />
            <Row label="Cartão de débito na entrega" value={debito} onChange={setDebito} />
            <div className="mt-4 grid gap-3 rounded-xl border p-4 md:grid-cols-3">
              <div><Label>Tipo de chave Pix</Label><Input placeholder="E-mail / CPF / Telefone" className="mt-1.5" /></div>
              <div><Label>Chave Pix</Label><Input placeholder="pix@loja.com" className="mt-1.5" /></div>
              <div><Label>Recebedor</Label><Input placeholder="Razão social" className="mt-1.5" /></div>
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
