import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, CheckCircle2, XCircle, Store } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { maskPhone } from "@/lib/masks";
import { isSlugAvailable } from "@/lib/tenants.functions";
import { signupPresencaTenant } from "@/lib/signup.functions";
import { supabase } from "@/integrations/supabase/client";

export function QuickSignupModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [accept, setAccept] = useState(false);

  useEffect(() => {
    if (!open) {
      setName(""); setSlug(""); setSlugTouched(false);
      setWhatsapp(""); setCity(""); setEmail("");
      setPw(""); setPw2(""); setAccept(false);
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

  const canSubmit = useMemo(
    () =>
      name.trim().length >= 2 &&
      slugOk &&
      whatsapp.replace(/\D/g, "").length >= 10 &&
      emailValid &&
      pwStrong &&
      pwMatch &&
      accept,
    [name, slugOk, whatsapp, emailValid, pwStrong, pwMatch, accept],
  );

  const signupMut = useMutation({
    mutationFn: async () => {
      const result = await signupPresencaTenant({
        data: {
          name: name.trim(),
          slug: computedSlug,
          whatsapp: whatsapp.replace(/\D/g, ""),
          city: city.trim(),
          email: email.trim().toLowerCase(),
          password: pw,
          full_name: name.trim(),
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
      // Hard navigation garante que o query string chega ao destino
      // e que o novo estado de auth é refletido em toda a árvore.
      window.location.href = "/admin/configuracoes?onboarding=1";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-2xl">Crie seu cardápio grátis</DialogTitle>
          <DialogDescription className="text-center">
            Plano <strong>Presença</strong> — sem taxas, sem comissão. Você completa o resto depois.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-3">
          <div>
            <Label>Nome do estabelecimento</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pizzaria Napoli" className="mt-1.5" />
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

          <div className="grid gap-3 sm:grid-cols-2">
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

          <div>
            <Label>E-mail de acesso</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className="mt-1.5" autoComplete="email" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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

          <Button
            size="lg"
            className="mt-1 gap-2"
            disabled={!canSubmit || signupMut.isPending}
            onClick={() => signupMut.mutate()}
          >
            {signupMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
            Criar minha loja grátis
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Sem cartão de crédito · Sem taxas sobre vendas · Cancele quando quiser
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
