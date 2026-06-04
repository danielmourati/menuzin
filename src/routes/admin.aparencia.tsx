import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Loader2 } from "lucide-react";
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (tenant?.theme_from) setColor(tenant.theme_from);
    setLogoUrl(tenant?.logo_url ?? null);
  }, [tenant?.theme_from, tenant?.logo_url]);

  const save = useMutation({
    mutationFn: () => updateMyTenant({ data: { theme_from: color, theme_to: color, logo_url: logoUrl } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tenant"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
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
            <ImageUploader
              label="Logo do estabelecimento"
              value={logoUrl}
              onChange={setLogoUrl}
              folder="logos"
              previewHeight="h-36"
            />
            <p className="-mt-3 text-xs text-muted-foreground">
              A logo aparece no topo do cardápio público da sua loja.
            </p>

            <div>
              <Label>Cor principal</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {palette.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={`h-10 w-10 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: c }} />
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
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-16 w-16 rounded-xl object-contain" />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-xl text-2xl font-bold text-white" style={{ background: color }}>
                      {tenant?.logo_letter || tenant?.name?.[0]?.toUpperCase() || "L"}
                    </div>
                  )}
                  <div>
                    <p className="font-bold">{tenant?.name ?? "Sua loja"}</p>
                    <p className="text-xs text-success">● {computeStoreOpen({ openMode: (tenant as { open_mode?: "auto"|"open"|"closed" })?.open_mode, hoursSchedule: (tenant as { hours_schedule?: unknown })?.hours_schedule, legacyOpen: tenant?.open }).open ? "Aberta" : "Fechada"}</p>
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
