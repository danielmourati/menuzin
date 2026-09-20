import { createFileRoute, useBlocker } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Loader2, Save, RotateCcw, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { computeStoreOpen } from "@/lib/store-hours";
import { getMyTenant, updateMyTenant } from "@/lib/tenants.functions";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/aparencia")({ component: AppearancePage });

function AppearancePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
  });
  const tenant = data?.tenant;

  const initialLogo = tenant?.logo_url ?? null;
  const initialCover = (tenant as { cover_url?: string | null })?.cover_url ?? null;

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    setLogoUrl(initialLogo);
    setCoverUrl(initialCover);
  }, [tenant?.logo_url, (tenant as { cover_url?: string | null })?.cover_url]);

  const isDirty = (logoUrl ?? null) !== initialLogo || (coverUrl ?? null) !== initialCover;

  // Previne fechar ou atualizar a aba se houver alterações pendentes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Bloqueador de navegação no TanStack Router quando há alterações não salvas
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => isDirty,
    withResolver: true,
  });

  const save = useMutation({
    mutationFn: () =>
      updateMyTenant({
        data: { logo_url: logoUrl, cover_url: coverUrl },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tenant"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Aparência salva com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDiscard = () => {
    setLogoUrl(initialLogo);
    setCoverUrl(initialCover);
  };

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
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 animate-pulse">
              ● Alterações pendentes
            </span>
          )}
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !tenant || !isDirty}
            size="sm"
            className="gap-1.5 font-semibold shadow-sm"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <Card className="flex flex-col justify-between shadow-sm">
            <CardContent className="space-y-6 p-6">
              {/* Cabeçalho do Card com botão direto nos olhos do usuário */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">Personalização do Cardápio</h2>
                  <p className="text-xs text-muted-foreground">Altere a logo e a foto de capa exibidas na sua loja pública.</p>
                </div>
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDiscard}
                      disabled={save.isPending}
                      className="text-xs text-muted-foreground"
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Descartar
                    </Button>
                  )}
                  <Button
                    onClick={() => save.mutate()}
                    disabled={save.isPending || !tenant || !isDirty}
                    className={`gap-2 font-semibold shadow-sm transition-all ${
                      isDirty ? "bg-primary hover:bg-primary/90 text-primary-foreground ring-2 ring-primary/20" : ""
                    }`}
                  >
                    {save.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isDirty ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {isDirty ? "Salvar Aparência" : "Salvo"}
                  </Button>
                </div>
              </div>

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
            </CardContent>

            {/* Rodapé do Card com ação de salvar próxima do fim da rolagem */}
            <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-4 rounded-b-xl">
              <span className="text-xs text-muted-foreground">
                {isDirty ? "⚠️ Você possui alterações não salvas" : "Todas as alterações estão salvas"}
              </span>
              <div className="flex items-center gap-2">
                {isDirty && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscard}
                    disabled={save.isPending}
                    className="text-xs"
                  >
                    Descartar
                  </Button>
                )}
                <Button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || !tenant || !isDirty}
                  size="sm"
                  className="gap-1.5 font-semibold"
                >
                  {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {isDirty ? "Salvar alterações" : "Salvo"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview da loja */}
          <Card><CardContent className="p-0 overflow-hidden">
            <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground font-semibold flex items-center justify-between">
              <span>Preview da loja</span>
              {isDirty && <span className="text-[10px] text-amber-600 font-bold">● Pré-visualização</span>}
            </div>
            <div className="bg-background">
              <div className="relative w-full h-32 bg-muted bg-cover bg-center overflow-visible" style={previewHeaderStyle}>
                <div className="absolute inset-0 bg-black/20" />
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

      {/* Barra flutuante de alterações não salvas estilo Shopify/Stripe */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-card/95 p-3 px-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
              </span>
              <span className="text-sm font-semibold text-foreground">Alterações não salvas</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                disabled={save.isPending}
                className="h-9 rounded-xl text-xs"
              >
                Descartar
              </Button>
              <Button
                size="sm"
                onClick={() => save.mutate()}
                disabled={save.isPending || !tenant}
                className="h-9 gap-1.5 rounded-xl bg-primary font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
              >
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar alterações
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de Confirmação para Impendir Navegação sem Salvar */}
      <AlertDialog open={status === "blocked"} onOpenChange={(open) => { if (!open) reset?.(); }}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="h-5 w-5 text-amber-500" /> Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Você alterou a logo ou a imagem de capa da loja e ainda não salvou. Se você sair agora, suas alterações serão descartadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => reset?.()} className="rounded-xl">
              Continuar editando
            </Button>
            <Button
              variant="destructive"
              onClick={() => proceed?.()}
              className="rounded-xl"
            >
              Descartar e sair
            </Button>
            <Button
              onClick={async () => {
                await save.mutateAsync();
                proceed?.();
              }}
              className="gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar e sair
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
