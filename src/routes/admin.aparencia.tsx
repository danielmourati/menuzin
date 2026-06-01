import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMyTenant, updateMyTenant } from "@/lib/tenants.functions";

export const Route = createFileRoute("/admin/aparencia")({ component: AppearancePage });

const palette = ["#FF4F1F", "#FFB020", "#16A34A", "#2563EB", "#9333EA", "#DC2626"];

function AppearancePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
  });
  const tenant = data?.tenant;

  const [color, setColor] = useState(palette[0]);
  const [dark, setDark] = useState(false);
  const [bannerText, setBannerText] = useState("Combo especial da semana — Burger + Refri por R$ 29,90");

  useEffect(() => {
    if (tenant?.theme_from) setColor(tenant.theme_from);
  }, [tenant?.theme_from]);

  const save = useMutation({
    mutationFn: () => updateMyTenant({ data: { theme_from: color, theme_to: color } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tenant"] });
      toast.success("Aparência salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminLayout
      title="Aparência"
      action={
        <Button onClick={() => save.mutate()} disabled={save.isPending || !tenant}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <Card><CardContent className="space-y-6 p-6">
            <div>
              <Label>Logo</Label>
              <button className="mt-2 flex h-32 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-muted-foreground hover:bg-muted/50">
                <Upload className="h-5 w-5" /> Enviar logo (em breve)
              </button>
            </div>
            <div>
              <Label>Banner</Label>
              <button className="mt-2 flex h-32 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-muted-foreground hover:bg-muted/50">
                <Upload className="h-5 w-5" /> Enviar banner (em breve)
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
                  <div className="grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: color }}>
                    {tenant?.logo_letter || tenant?.name?.[0]?.toUpperCase() || "L"}
                  </div>
                  <div>
                    <p className="font-bold">{tenant?.name ?? "Sua loja"}</p>
                    <p className="text-xs text-success">● {tenant?.open ? "Aberta" : "Fechada"}</p>
                  </div>
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
      )}
    </AdminLayout>
  );
}
