import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { isSlugAvailable } from "@/lib/tenants.functions";
import { adminCreateTenant } from "@/lib/platform.functions";
import { maskPhone } from "@/lib/masks";
import { PlatformLayout } from "./platform.dashboard";

export const Route = createFileRoute("/platform/tenants/novo")({ component: NewTenantPage });

function NewTenantPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [themeFrom, setThemeFrom] = useState("#FF6A1F");
  const [themeTo, setThemeTo] = useState("#FF9A3C");
  const [active, setActive] = useState(true);

  const computedSlug = slugTouched ? slugify(slug) : slugify(name);

  const { data: slugCheck, isFetching: slugChecking } = useQuery({
    queryKey: ["slug-check", computedSlug],
    queryFn: () => isSlugAvailable({ data: { slug: computedSlug } }),
    enabled: computedSlug.length >= 2,
    staleTime: 0,
  });
  const slugOk = computedSlug.length >= 3 && !!slugCheck?.available;
  const canSubmit = name.trim().length >= 2 && slugOk && whatsapp.trim().length >= 8;

  const previewUrl = useMemo(
    () => (computedSlug ? `seudominio.com.br/loja/${computedSlug}` : "seudominio.com.br/loja/sua-loja"),
    [computedSlug],
  );

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const createMut = useMutation({
    mutationFn: () =>
      adminCreateTenant({
        data: {
          slug: computedSlug,
          name: name.trim(),
          description: description.trim(),
          whatsapp: whatsapp.replace(/\D/g, ""),
          city,
          address,
          theme_from: themeFrom,
          theme_to: themeTo,
          active,
        },
      }),
    onSuccess: () => {
      toast.success(`Loja "${name.trim()}" cadastrada!`);
      navigate({ to: "/platform/lojas" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Preencha os campos obrigatórios e escolha um slug válido.");
      return;
    }
    createMut.mutate();
  };

  return (
    <PlatformLayout title="Cadastrar novo estabelecimento">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
        <Card><CardContent className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome da loja *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pizzaria Napoli" className="mt-1.5" />
            </div>
            <div>
              <Label>Slug (URL) *</Label>
              <Input
                value={computedSlug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                placeholder="pizzaria-napoli"
                className="mt-1.5 font-mono"
              />
              {computedSlug && !slugChecking && !slugOk && (
                <p className="mt-1 text-xs text-destructive">
                  {computedSlug.length < 3 ? "Mínimo 3 caracteres." : "Slug já em uso."}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={3} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>WhatsApp *</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5586999999999" className="mt-1.5" />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Teresina" className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Endereço</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Cor primária</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input type="color" value={themeFrom} onChange={(e) => setThemeFrom(e.target.value)} className="h-10 w-12 cursor-pointer rounded border" />
                <Input value={themeFrom} onChange={(e) => setThemeFrom(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div>
              <Label>Cor secundária</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input type="color" value={themeTo} onChange={(e) => setThemeTo(e.target.value)} className="h-10 w-12 cursor-pointer rounded border" />
                <Input value={themeTo} onChange={(e) => setThemeTo(e.target.value)} className="font-mono" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="font-medium">Tenant ativo</p>
              <p className="text-xs text-muted-foreground">Lojas inativas não aparecem para o público.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate({ to: "/platform/lojas" })}>Cancelar</Button>
            <Button disabled={!canSubmit || createMut.isPending} onClick={handleSubmit}>
              {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar loja
            </Button>
          </div>
        </CardContent></Card>

        <Card><CardContent className="space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pré-visualização</p>
            <div
              className="mt-2 grid h-32 place-items-center rounded-2xl text-white shadow-md"
              style={{ backgroundImage: `linear-gradient(135deg, ${themeFrom}, ${themeTo})` }}
            >
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border-4 border-white/40 bg-white/15 text-2xl font-bold backdrop-blur">
                  {(name.trim().charAt(0) || "L").toUpperCase()}
                </div>
                <p className="mt-2 text-sm font-semibold">{name || "Nome da loja"}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">URL pública</p>
            <p className="mt-1 break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm">{previewUrl}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            O slug é gerado automaticamente a partir do nome. Cada loja tem dados, produtos e pedidos isolados pelo seu <strong>tenant_id</strong>.
          </div>
        </CardContent></Card>
      </div>
    </PlatformLayout>
  );
}
