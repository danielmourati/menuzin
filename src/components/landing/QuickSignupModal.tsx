import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, XCircle, Store, ChevronLeft, Utensils } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { maskPhone } from "@/lib/masks";
import { isSlugAvailable } from "@/lib/tenants.functions";
import { signupPresencaTenant } from "@/lib/signup.functions";
import { supabase } from "@/integrations/supabase/client";
import { BUSINESS_TYPES, BUSINESS_TYPE_LABELS, type BusinessType } from "@/lib/business-types";

const STEPS = [
  { id: 1, label: "Tipo de negócio" },
  { id: 2, label: "Dados da loja" },
  { id: 3, label: "Sua conta" },
];

export function QuickSignupModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = useState(1);

  // Step 1
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);

  // Step 2
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");

  // Step 3
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [accept, setAccept] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setBusinessType(null);
      setName("");
      setSlug("");
      setSlugTouched(false);
      setWhatsapp("");
      setCity("");
      setEmail("");
      setPw("");
      setPw2("");
      setAccept(false);
    }
  }, [open]);

  const computedSlug = slugTouched ? slugify(slug) : slugify(name);

  const { data: slugCheck, isFetching: slugChecking } = useQuery({
    queryKey: ["public-slug-check", computedSlug],
    queryFn: () => isSlugAvailable({ data: { slug: computedSlug } }),
    enabled: computedSlug.length >= 3,
    staleTime: 0,
  });
  const slugOk = computedSlug.length >= 3 && !!slugCheck?.available;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const pwStrong = pw.length >= 8;
  const pwMatch = pw.length > 0 && pw === pw2;

  const step1Valid = businessType !== null;
  const step2Valid =
    name.trim().length >= 2 && slugOk && whatsapp.replace(/\D/g, "").length >= 10;
  const step3Valid = emailValid && pwStrong && pwMatch && accept;

  const canSubmit = step1Valid && step2Valid && step3Valid;

  const next = () => {
    if (step === 1 && !step1Valid) {
      toast.error("Selecione um tipo de negócio.");
      return;
    }
    if (step === 2 && !step2Valid) {
      toast.error("Preencha os dados da loja corretamente.");
      return;
    }
    if (step < 3) setStep((s) => s + 1);
  };

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const signupMut = useMutation({
    mutationFn: async () => {
      if (!businessType) throw new Error("Selecione um tipo de negócio.");
      const result = await signupPresencaTenant({
        data: {
          name: name.trim(),
          slug: computedSlug,
          whatsapp: whatsapp.replace(/\D/g, ""),
          city: city.trim(),
          email: email.trim().toLowerCase(),
          password: pw,
          full_name: name.trim(),
          business_type: businessType,
        },
      });
      // Auto-login
      const { error } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: pw,
      });
      if (error) throw new Error(`Loja criada, mas falhou o login automático: ${error.message}`);
      return result;
    },
    onSuccess: () => {
      toast.success("Loja criada! Vamos completar seu perfil.");
      onOpenChange(false);
      window.location.href = "/admin/configuracoes?onboarding=1";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    signupMut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            {step === 1 ? <Utensils className="h-6 w-6" /> : <Store className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-center text-2xl">Crie seu cardápio grátis</DialogTitle>
          <DialogDescription className="text-center">
            Plano <strong>Presença</strong> — sem taxas, sem comissão. Você completa o resto depois.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="px-6 pt-2 shrink-0">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                      step >= s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                  </div>
                  <span className={`text-[10px] ${step >= s.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 rounded-full ${
                      step > s.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-6 pb-6 mt-2">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base">Tipo de negócio</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione um tipo. Por padrão, o novo tenant é criado vazio — você monta o cardápio depois.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {BUSINESS_TYPES.map((t) => (
                  <label
                    key={t}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-sm transition hover:border-primary/40 ${
                      businessType === t ? "border-primary ring-1 ring-primary" : ""
                    }`}
                    onClick={() => setBusinessType(t)}
                  >
                    <div
                      className={`grid h-5 w-5 place-items-center rounded-full border ${
                        businessType === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {businessType === t && <div className="h-2 w-2 rounded-full bg-current" />}
                    </div>
                    <span className="font-medium">{BUSINESS_TYPE_LABELS[t]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <div>
                <Label>Nome do estabelecimento</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Pizzaria Napoli"
                  className="mt-1.5"
                  autoFocus
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  Endereço da sua loja
                  {computedSlug.length >= 3 && !slugChecking && (
                    slugOk ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> disponível</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3 w-3" /> em uso</span>
                    )
                  )}
                </Label>
                <div className="mt-1.5 flex overflow-hidden rounded-md border">
                  <span className="inline-flex items-center bg-muted px-3 text-xs text-muted-foreground">menuzin.app/</span>
                  <Input
                    value={computedSlug}
                    onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                    placeholder="sua-loja"
                    className="rounded-none border-0 font-mono focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>WhatsApp</Label>
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    maxLength={15}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Cidade (opcional)</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sua cidade" className="mt-1.5" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <div>
                <Label>E-mail de acesso</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className="mt-1.5" autoComplete="email" autoFocus />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Senha</Label>
                  <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Mínimo 8 caracteres" className="mt-1.5" autoComplete="new-password" />
                </div>
                <div>
                  <Label>Confirmar senha</Label>
                  <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1.5" autoComplete="new-password" />
                  {pw2.length > 0 && !pwMatch && (
                    <p className="mt-1 text-xs text-destructive">As senhas não coincidem.</p>
                  )}
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs">
                <Checkbox checked={accept} onCheckedChange={(v) => setAccept(!!v)} className="mt-0.5" />
                <span className="text-muted-foreground">
                  Li e aceito os termos de uso e a política de privacidade do Menuzin.
                </span>
              </label>
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-6 flex items-center gap-3">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={back} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
                Cancelar
              </Button>
            )}

            {step < 3 ? (
              <Button type="button" className="ml-auto gap-2" onClick={next}>
                Avançar <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                className="ml-auto gap-2"
                disabled={!canSubmit || signupMut.isPending}
                onClick={handleSubmit}
              >
                {signupMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                Criar minha loja grátis
              </Button>
            )}
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Sem cartão de crédito · Sem taxas sobre vendas · Cancele quando quiser
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
