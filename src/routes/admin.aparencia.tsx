import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { computeStoreOpen } from "@/lib/store-hours";

import { getMyTenant, updateMyTenant } from "@/lib/tenants.functions";

export const Route = createFileRoute("/admin/aparencia")({ component: AppearancePage });

function AppearancePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
  });
  const tenant = data?.tenant;

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    setLogoUrl(tenant?.logo_url ?? null);
    setCoverUrl((tenant as { cover_url?: string | null })?.cover_url ?? null);
  }, [tenant?.logo_url, (tenant as { cover_url?: string | null })?.cover_url]);

  const save = useMutation({
    mutationFn: () =>
      updateMyTenant({
        data: { logo_url: logoUrl, cover_url: coverUrl },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tenant"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Aparência salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewHeaderStyle: React.CSSProperties = coverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.45)), url(${coverUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground)/0.3))" };

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

            <ImageUploader
              label="Imagem de fundo (capa da loja)"
              value={coverUrl}
              onChange={setCoverUrl}
              folder="covers"
              previewHeight="h-40"
            />
            <p className="-mt-3 text-xs text-muted-foreground">
              Foto exibida no topo do cardápio. Recomendado: paisagem, mínimo 1200px de largura.
            </p>
          </CardContent></Card>

          <Card><CardContent className="p-0 overflow-hidden">
            <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">Preview da loja</div>
            <div className="bg-background">
              {/* Novo Preview da Loja similar ao novo layout do storefront */}
              <div className="relative w-full h-32 bg-muted bg-cover bg-center overflow-visible" style={previewHeaderStyle}>
                <div className="absolute inset-0 bg-black/20" />
                {/* Logo centralizada na borda inferior */}
                <div className="absolute left-1/2 bottom-0 z-20 h-16 w-16 -translate-x-1/2 translate-y-1/2 overflow-hidden rounded-full border-4 border-card bg-card shadow">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-primary text-primary-foreground font-bold text-lg">
                      {tenant?.logo_letter || tenant?.name?.[0]?.toUpperCase() || "L"}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 pt-10 text-center">
                <h3 className="text-sm font-bold text-foreground truncate">{tenant?.name ?? "Sua loja"}</h3>
                <p className={`mt-0.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold ${
                  computeStoreOpen({
                    openMode: (tenant as { open_mode?: "auto"|"open"|"closed" })?.open_mode,
                    hoursSchedule: (tenant as { hours_schedule?: unknown })?.hours_schedule,
                    legacyOpen: tenant?.open
                  }).open ? "text-success" : "text-destructive"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    computeStoreOpen({
                      openMode: (tenant as { open_mode?: "auto"|"open"|"closed" })?.open_mode,
                      hoursSchedule: (tenant as { hours_schedule?: unknown })?.hours_schedule,
                      legacyOpen: tenant?.open
                    }).open ? "bg-success" : "bg-destructive"
                  }`} />
                  {computeStoreOpen({
                    openMode: (tenant as { open_mode?: "auto"|"open"|"closed" })?.open_mode,
                    hoursSchedule: (tenant as { hours_schedule?: unknown })?.hours_schedule,
                    legacyOpen: tenant?.open
                  }).open ? "Aberta" : "Fechada"}
                </p>
                
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="rounded-xl border p-2 text-left">
                        <div className="aspect-square rounded-lg bg-muted" />
                        <p className="mt-1 text-xs font-semibold">Produto {i}</p>
                        <p className="text-xs text-muted-foreground">R$ 24,90</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent></Card>
        </div>
      )}
    </AdminLayout>
  );
}

