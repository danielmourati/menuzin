// Wizard guiado para montar o cardápio pela primeira vez.
//
// Fluxo em 3 passos, sem fricção — impede o erro clássico de tentar cadastrar
// produto sem categoria:
//   1. Categoria — cria (ou escolhe uma existente)
//   2. Produto   — nome, preço, descrição, imagem (dentro da categoria do passo 1)
//   3. Pronto    — atalhos para adicionar mais itens ou ir ao painel de produtos
//
// Reaproveita as server functions existentes em catalog-admin.functions.
// Não substitui as telas /admin/categorias e /admin/produtos — é uma porta
// de entrada opcional para quem está começando do zero.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ImageUploader } from "@/components/ui/image-uploader";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Plus, Tag, UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import {
  listMyCategories, saveCategory, saveProduct,
} from "@/lib/catalog-admin.functions";

export const Route = createFileRoute("/admin/cardapio/novo")({
  head: () => ({
    meta: [
      { title: "Novo cardápio — Menuzin" },
      { name: "description", content: "Assistente guiado para criar categorias e produtos do seu cardápio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WizardPage,
});

type Step = 1 | 2 | 3;

function WizardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const categoriesQ = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await listMyCategories()).categories,
    retry: false,
  });
  const categories = categoriesQ.data ?? [];

  const [step, setStep] = useState<Step>(1);

  // Passo 1
  const [catMode, setCatMode] = useState<"new" | "existing">("new");
  const [catName, setCatName] = useState("");
  const [catId, setCatId] = useState<string | null>(null);

  // Passo 2
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState(0);
  const [prodImage, setProdImage] = useState<string | null>(null);

  const [createdProducts, setCreatedProducts] = useState(0);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === catId) ?? null,
    [categories, catId],
  );

  // Se já existem categorias, o modo padrão é "existing".
  useMemo(() => {
    if (categories.length > 0 && catMode === "new" && !catId && step === 1) {
      setCatMode("existing");
      setCatId(categories[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  const catMut = useMutation({
    mutationFn: async (name: string) => {
      const res = await saveCategory({
        data: {
          name,
          description: "",
          sort_order: categories.length + 1,
          active: true,
          kind: "standard",
        },
      });
      return res.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      setCatId(id);
      setStep(2);
      toast.success("Categoria criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const prodMut = useMutation({
    mutationFn: async (opts: { thenAnother: boolean }) => {
      if (!catId) throw new Error("Selecione uma categoria antes.");
      if (!prodName.trim()) throw new Error("Informe o nome do produto.");
      await saveProduct({
        data: {
          name: prodName.trim(),
          description: prodDesc.trim(),
          category_id: catId,
          price: prodPrice,
          promo_price: null,
          image_url: prodImage || null,
          available: true,
          featured: false,
          bestseller: false,
          prep_time: null,
          sort_order: createdProducts + 1,
          type: "standard",
          max_flavors: null,
          allow_observations: true,
          listed_as_flavor: null,
          free_gift_kind: null,
          free_gift_ref_id: null,
          free_crust_mode: "none",
        },
      });
      return opts;
    },
    onSuccess: ({ thenAnother }) => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setCreatedProducts((n) => n + 1);
      toast.success("Produto adicionado");
      setProdName("");
      setProdDesc("");
      setProdPrice(0);
      setProdImage(null);
      if (!thenAnother) setStep(3);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goToStep2 = () => {
    if (catMode === "new") {
      if (!catName.trim()) return toast.error("Dê um nome à categoria.");
      catMut.mutate(catName.trim());
      return;
    }
    if (!catId) return toast.error("Selecione uma categoria.");
    setStep(2);
  };

  return (
    <AdminLayout title="Novo cardápio">
      <div className="mx-auto max-w-2xl space-y-4">
        <Stepper step={step} />

        {step === 1 && (
          <Card>
            <CardContent className="space-y-4 p-5">
              <Header
                icon={<Tag className="h-5 w-5" />}
                title="1. Comece por uma categoria"
                subtitle="Ex.: Lanches, Bebidas, Sobremesas. Toda categoria vira uma seção do seu cardápio."
              />

              {categories.length > 0 && (
                <div className="flex gap-2 rounded-md bg-muted p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setCatMode("existing")}
                    className={
                      "flex-1 rounded-sm px-3 py-1.5 " +
                      (catMode === "existing" ? "bg-background shadow-sm" : "text-muted-foreground")
                    }
                  >
                    Usar existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatMode("new")}
                    className={
                      "flex-1 rounded-sm px-3 py-1.5 " +
                      (catMode === "new" ? "bg-background shadow-sm" : "text-muted-foreground")
                    }
                  >
                    Criar nova
                  </button>
                </div>
              )}

              {catMode === "new" ? (
                <div className="space-y-2">
                  <Label>Nome da categoria</Label>
                  <Input
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Ex.: Lanches"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={catId ?? ""} onValueChange={setCatId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" asChild>
                  <Link to="/admin/produtos"><ArrowLeft className="mr-1 h-4 w-4" /> Cancelar</Link>
                </Button>
                <Button onClick={goToStep2} disabled={catMut.isPending}>
                  {catMut.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-1 h-4 w-4" />
                  )}
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="space-y-4 p-5">
              <Header
                icon={<UtensilsCrossed className="h-5 w-5" />}
                title="2. Adicione um produto"
                subtitle={
                  selectedCategory
                    ? `Na categoria: ${selectedCategory.name}`
                    : "Escolha uma categoria antes."
                }
              />

              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <div>
                  <Label className="mb-1 block">Imagem</Label>
                  <ImageUploader
                    value={prodImage}
                    onChange={(v) => setProdImage(v)}
                    folder="products"
                  />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Ex.: X-Salada"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Preço</Label>
                    <CurrencyInput
                      value={prodPrice}
                      onValueChange={setProdPrice}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  rows={3}
                  placeholder="Ingredientes, porção, sabor..."
                />
              </div>

              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => prodMut.mutate({ thenAnother: true })}
                    disabled={prodMut.isPending}
                  >
                    {prodMut.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-4 w-4" />
                    )}
                    Salvar e adicionar outro
                  </Button>
                  <Button
                    onClick={() => prodMut.mutate({ thenAnother: false })}
                    disabled={prodMut.isPending}
                  >
                    {prodMut.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    Salvar e concluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Cardápio no ar</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {createdProducts} produto{createdProducts === 1 ? "" : "s"} adicionado
                  {createdProducts === 1 ? "" : "s"}
                  {selectedCategory ? ` em ${selectedCategory.name}` : ""}.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(2);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Adicionar outro produto
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCatName("");
                    setCatId(null);
                    setCatMode(categories.length > 0 ? "existing" : "new");
                    setStep(1);
                  }}
                >
                  <Tag className="mr-1 h-4 w-4" /> Nova categoria
                </Button>
                <Button onClick={() => navigate({ to: "/admin/produtos" })}>
                  Ir para produtos <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function Header({
  icon, title, subtitle,
}: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const items: { n: Step; label: string }[] = [
    { n: 1, label: "Categoria" },
    { n: 2, label: "Produto" },
    { n: 3, label: "Pronto" },
  ];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {items.map((it, i) => {
        const active = step === it.n;
        const done = step > it.n;
        return (
          <li key={it.n} className="flex flex-1 items-center gap-2">
            <div
              className={
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-medium " +
                (done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground")
              }
            >
              {done ? <Check className="h-3.5 w-3.5" /> : it.n}
            </div>
            <span className={active || done ? "font-medium" : "text-muted-foreground"}>
              {it.label}
            </span>
            {i < items.length - 1 && (
              <span className="mx-1 h-px flex-1 bg-muted-foreground/20" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
