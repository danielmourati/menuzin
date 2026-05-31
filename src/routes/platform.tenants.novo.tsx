import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { isSlugAvailable, slugify, tenants, type Tenant } from "@/lib/mock-data";
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
  const [ownerEmail, setOwnerEmail] = useState("");
  const [themeFrom, setThemeFrom] = useState("#FF6A1F");
  const [themeTo, setThemeTo] = useState("#FF9A3C");
  const [active, setActive] = useState(true);

  const computedSlug = slugTouched ? slugify(slug) : slugify(name);
  const slugOk = computedSlug.length >= 3 && isSlugAvailable(computedSlug);
  const canSubmit = name.trim().length >= 2 && slugOk && whatsapp.trim().length >= 8;

  const previewUrl = useMemo(
    () => (computedSlug ? `seudominio.com.br/${computedSlug}` : "seudominio.com.br/sua-loja"),
    [computedSlug],
  );

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Preencha os campos obrigatórios e escolha um slug válido.");
      return;
    }
    // Mock: empurra para a lista em memória
    const next: Tenant = {
      id: `t${tenants.length + 1}`,
      slug: computedSlug,
      name: name.trim(),
      description: description.trim() || "Nova loja cadastrada na plataforma.",
      whatsapp: whatsapp.replace(/\D/g, ""),
      city: city || "—",
      state: "",
      address: address || "—",
      open: active,
      prepTime: "30 a 45 min",
      minOrder: 15,
      deliveryFee: 5,
      hours: "Definir no painel da loja",
      logoLetter: name.trim().charAt(0).toUpperCase() || "L",
      themeFrom,
      themeTo,
      active,
    };
    tenants.push(next);
    toast.success(`Loja "${next.name}" cadastrada!`, {
      description: `Vitrine disponível em /${next.slug}. Credenciais enviadas para ${ownerEmail || "o dono cadastrado"}.`,
    });
    navigate({ to: "/platform/lojas" });
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
              {!slugOk && computedSlug && (
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
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Teresina/PI" className="mt-1.5" />
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

          <div className="rounded-2xl border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold">Usuário dono do estabelecimento</h3>
            <p className="text-xs text-muted-foreground">As credenciais de acesso serão enviadas por e-mail (mock).</p>
            <Input
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="dono@loja.com.br"
              className="mt-3"
            />
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
            <Button disabled={!canSubmit} onClick={handleSubmit}>Cadastrar loja</Button>
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
