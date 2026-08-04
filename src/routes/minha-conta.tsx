// Minha conta — perfil universal do cliente (sem senha, sem cadastro obrigatório).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Receipt, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useCustomerProfile,
  writeCustomerProfile,
  clearCustomerProfile,
} from "@/lib/customer-profile";
import { getCustomerProfile, saveCustomerProfile } from "@/lib/customers.functions";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — Guia Menuzin" },
      {
        name: "description",
        content:
          "Veja e complete seus dados de entrega salvos no Menuzin: nome, WhatsApp, e-mail e endereço.",
      },
      { property: "og:title", content: "Minha conta — Guia Menuzin" },
      {
        property: "og:description",
        content: "Seus dados de entrega salvos no Menuzin, sem cadastro nem senha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MinhaConta,
});

function MinhaConta() {
  const profile = useCustomerProfile();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const canQuery = !!profile?.phone && !!profile?.token;
  const { data, isLoading } = useQuery({
    queryKey: ["customer", "profile", profile?.phone],
    queryFn: () =>
      getCustomerProfile({ data: { phone: profile!.phone, token: profile!.token! } }),
    enabled: canQuery,
  });

  const remote = data?.customer ?? null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(remote?.name ?? profile?.name ?? "");
    setEmail(remote?.email ?? profile?.email ?? "");
    setBirthdate(remote?.birthdate ?? profile?.birthdate ?? "");
  }, [remote, profile?.name, profile?.email, profile?.birthdate]);

  const save = async () => {
    if (!profile?.phone) return;
    setSaving(true);
    try {
      const res = await saveCustomerProfile({
        data: {
          phone: profile.phone,
          name: name.trim() || null,
          email: email.trim() || null,
          birthdate: birthdate || null,
        },
      });
      if (res.customer) {
        writeCustomerProfile({
          name: res.customer.name,
          email: res.customer.email,
          birthdate: res.customer.birthdate,
          token: res.customer.token,
        });
      }
      toast.success("Dados salvos");
    } catch {
      toast.error("Não foi possível salvar agora");
    } finally {
      setSaving(false);
    }
  };

  const addr = remote?.address ?? profile?.address ?? null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link to="/guia">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-bold leading-tight">Minha conta</h1>
            <p className="text-xs text-muted-foreground">
              Seus dados salvos neste dispositivo
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {!hydrated || (canQuery && isLoading) ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !canQuery ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <User className="h-6 w-6" />
            </div>
            <h2 className="mt-3 font-semibold">Você ainda não tem dados salvos</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Ao finalizar seu primeiro pedido, seus dados ficam salvos aqui para as próximas
              compras em qualquer loja do Menuzin.
            </p>
            <Button asChild className="mt-4">
              <Link to="/guia">Explorar o Guia</Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-bold">Dados encontrados</h2>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">WhatsApp</dt>
                  <dd className="font-semibold">{remote?.phone ?? profile?.phone}</dd>
                </div>
                {(remote?.city ?? profile?.city) && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Cidade</dt>
                    <dd className="font-semibold">
                      {remote?.city ?? profile?.city}
                      {(remote?.uf ?? profile?.uf) ? `/${remote?.uf ?? profile?.uf}` : ""}
                    </dd>
                  </div>
                )}
                {addr?.street && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Endereço</dt>
                    <dd className="text-right font-semibold">
                      {addr.street}
                      {addr.number ? `, ${addr.number}` : ""}
                      {addr.neighborhood ? ` — ${addr.neighborhood}` : ""}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Pedidos feitos</dt>
                  <dd className="font-semibold">{remote?.ordersCount ?? 0}</dd>
                </div>
              </dl>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/meus-pedidos">
                  <Receipt className="mr-2 h-4 w-4" /> Ver meus pedidos
                </Link>
              </Button>
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-bold">Completar cadastro</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Opcional — ajuda as lojas a te reconhecerem e enviarem novidades.
              </p>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Nome</Label>
                  <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">E-mail</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-birth">Data de nascimento</Label>
                  <Input
                    id="c-birth"
                    type="date"
                    value={birthdate ?? ""}
                    onChange={(e) => setBirthdate(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar dados
                </Button>
              </div>
            </section>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Seus dados ficam privados e só são usados
              nos seus pedidos.
            </p>

            <button
              type="button"
              onClick={() => clearCustomerProfile()}
              className="mx-auto block text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Esquecer meus dados neste dispositivo
            </button>
          </>
        )}
      </main>
    </div>
  );
}
