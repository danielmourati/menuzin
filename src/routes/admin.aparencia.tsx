import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { store } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/aparencia")({ component: AppearancePage });

const palette = ["#FF4F1F", "#FFB020", "#16A34A", "#2563EB", "#9333EA", "#DC2626"];

function AppearancePage() {
  const [color, setColor] = useState(palette[0]);
  const [dark, setDark] = useState(false);
  const [bannerText, setBannerText] = useState("Combo especial da semana — Burger + Refri por R$ 29,90");

  return (
    <AdminLayout title="Aparência" action={<Button onClick={() => toast.success("Aparência salva")}>Salvar</Button>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card><CardContent className="space-y-6 p-6">
          <div>
            <Label>Logo</Label>
            <button className="mt-2 flex h-32 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-muted-foreground hover:bg-muted/50">
              <Upload className="h-5 w-5" /> Enviar logo (mock)
            </button>
          </div>
          <div>
            <Label>Banner</Label>
            <button className="mt-2 flex h-32 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-muted-foreground hover:bg-muted/50">
              <Upload className="h-5 w-5" /> Enviar banner (mock)
            </button>
          </div>
          <div>
            <Label>Texto promocional do banner</Label>
            <Input value={bannerText} onChange={(e) => setBannerText(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Cor principal</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {palette.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={`h-10 w-10 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <Label>Tema</Label>
            <div className="mt-2 flex gap-2">
              <Button variant={!dark ? "default" : "outline"} onClick={() => setDark(false)}>Claro</Button>
              <Button variant={dark ? "default" : "outline"} onClick={() => setDark(true)}>Escuro</Button>
            </div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-0 overflow-hidden">
          <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">Preview da loja</div>
          <div className={dark ? "dark bg-background" : "bg-background"}>
            <div className="h-32 w-full" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
              <div className="flex h-full items-end p-3">
                <p className="rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs text-white">{bannerText}</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: color }}>{store.logoLetter}</div>
                <div><p className="font-bold">{store.name}</p><p className="text-xs text-success">● Aberta</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl border p-2">
                    <div className="aspect-square rounded-lg" style={{ background: `${color}22` }} />
                    <p className="mt-1 text-xs font-semibold">Produto {i}</p>
                    <p className="text-xs" style={{ color }}>R$ 24,90</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}
