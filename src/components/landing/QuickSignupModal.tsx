import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Phone,
  Utensils,
  Mail,
  Lock,
  TrendingUp,
  Shield,
  Cloud,
  Loader2,
  LockKeyhole,
  CheckCircle2,
  XCircle,
  Store,
  ChevronLeft,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { maskPhone } from "@/lib/masks";
import { slugify } from "@/lib/utils";
import { lookupByCep } from "@/lib/viacep";
import { isSlugAvailable } from "@/lib/tenants.functions";
import { signupPresencaTenant } from "@/lib/signup.functions";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import { BUSINESS_TYPES, BUSINESS_TYPE_LABELS, type BusinessType } from "@/lib/business-types";
import { useNavigate } from "@tanstack/react-router";

export function QuickSignupModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pendingEmail, setPendingEmail] = useState("");

  // Step 1: Dados Iniciais da Conta e Negócio
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Step 2: Tipo de negócio
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);

  // Step 3: Dados Complementares da Loja
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Auto-gera o slug com base no nome do negócio
  const computedSlug = slugTouched ? slugify(slug) : slugify(businessName);

  // Reset do formulário ao fechar o modal
  useEffect(() => {
    if (!open) {
      setStep(1);
      setPendingEmail("");
      setFullName("");
      setWhatsapp("");
      setBusinessName("");
      setEmail("");
      setPassword("");
      setAcceptTerms(true);
      setBusinessType(null);
      setSlug("");
      setSlugTouched(false);
      setCep("");
      setStreet("");
      setNumber("");
      setNeighborhood("");
      setCity("");
      setState("");
    }
  }, [open]);

  // Busca automática por CEP
  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    let cancelled = false;
    lookupByCep(digits).then((res) => {
      if (cancelled || res.status !== "ok" || res.results.length === 0) return;
      const r = res.results[0];
      if (!street) setStreet(r.logradouro || "");
      if (!neighborhood) setNeighborhood(r.bairro || "");
      if (!city) setCity(r.localidade || "");
      if (!state) setState((r.uf || "").toUpperCase());
    });
    return () => {
      cancelled = true;
    };
  }, [cep, street, neighborhood, city, state]);

  // Validação em tempo real da disponibilidade do slug
  const { data: slugCheck, isFetching: slugChecking } = useQuery({
    queryKey: ["public-slug-check", computedSlug],
    queryFn: () => isSlugAvailable({ data: { slug: computedSlug } }),
    enabled: computedSlug.length >= 3,
    staleTime: 0,
  });
  const slugOk = computedSlug.length >= 3 && !!slugCheck?.available;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Validações por etapa
  const step1Valid =
    fullName.trim().length >= 2 &&
    whatsapp.replace(/\D/g, "").length >= 10 &&
    businessName.trim().length >= 2 &&
    emailValid &&
    password.length >= 8 &&
    acceptTerms;

  const step2Valid = businessType !== null;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Informe seu nome completo.");
    if (whatsapp.replace(/\D/g, "").length < 10) return toast.error("Informe um WhatsApp válido com DDD.");
    if (!businessName.trim()) return toast.error("Informe o nome do seu negócio.");
    if (!emailValid) return toast.error("Informe um e-mail válido.");
    if (password.length < 8) return toast.error("A senha deve ter no mínimo 8 caracteres.");
    if (!acceptTerms) return toast.error("Aceite os termos para continuar.");

    setStep(2);
  };

  const handleStep2Next = () => {
    if (!businessType) return toast.error("Selecione o tipo do seu negócio.");
    setStep(3);
  };

  const signupMut = useMutation({
    mutationFn: async () => {
      const result = await signupPresencaTenant({
        data: {
          name: businessName.trim(),
          slug: computedSlug,
          whatsapp: whatsapp.replace(/\D/g, ""),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          address: street.trim() && number.trim() ? `${street.trim()}, ${number.trim()}` : street.trim(),
          neighborhood: neighborhood.trim(),
          cep: cep.replace(/\D/g, ""),
          email: email.trim().toLowerCase(),
          password: password,
          full_name: fullName.trim() || businessName.trim(),
          business_type: businessType || "restaurante",
        },
      });

      const redirectUrl = `${window.location.origin}/admin/dashboard`;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: result.email,
        options: { emailRedirectTo: redirectUrl },
      });

      if (error) {
        console.error("signup: falha ao enviar e-mail de confirmação", error);
      }

      return result;
    },
    onSuccess: (result) => {
      setPendingEmail(result.email);
      toast.success("Cadastro realizado com sucesso! Verifique seu e-mail.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resendMut = useMutation({
    mutationFn: async () => {
      const redirectUrl = `${window.location.origin}/admin/dashboard`;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("E-mail de confirmação reenviado."),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return toast.error("Informe o nome do estabelecimento.");
    if (computedSlug.length < 3) return toast.error("O endereço da loja deve ter pelo menos 3 caracteres.");
    if (!slugOk && !slugChecking) return toast.error("O endereço informado já está em uso.");
    if (whatsapp.replace(/\D/g, "").length < 10) return toast.error("Informe um WhatsApp válido.");

    signupMut.mutate();
  };

  // Tela de Confirmação por E-mail
  if (pendingEmail) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-6 sm:p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 mb-4">
            <Mail className="h-8 w-8 animate-pulse" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">Confirme seu e-mail</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground mt-2">
            Enviamos um link de ativação para <strong className="text-foreground">{pendingEmail}</strong>.
            <br />
            Clique no link recebido para confirmar seu cadastro e acessar a sua <strong>área de admin</strong>.
          </DialogDescription>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl border bg-muted/30 p-3.5 text-xs text-muted-foreground text-center">
              Não encontrou o e-mail? Verifique a caixa de <strong>Spam</strong> ou <strong>Lixo eletrônico</strong>.
            </div>

            <Button
              variant="outline"
              className="w-full h-11 border-orange-200 dark:border-orange-900 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              onClick={() => resendMut.mutate()}
              disabled={resendMut.isPending}
            >
              {resendMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Reenviar e-mail de confirmação
            </Button>

            <Button
              className="w-full h-11 bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/admin/login" });
              }}
            >
              Ir para o login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-card text-card-foreground">
        <DialogTitle className="sr-only">Crie seu cardápio grátis no Menuzin</DialogTitle>
        <DialogDescription className="sr-only">Cadastre seu estabelecimento no plano Presença grátis.</DialogDescription>

        {/* ETAPA 1: Banner + Formulário Rápido (Anexo 1 ajustado com Paleta Menuzin) */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
            {/* Esquerda: Banner Menuzin */}
            <div className="md:col-span-5 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 text-white p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-black/20 blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                {/* Selo / Badge */}
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur-md border border-white/20">
                  <Zap className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                  <span className="text-xs font-bold tracking-wide uppercase text-white">
                    100% GRATUITO · PLANO PRESENÇA
                  </span>
                </div>

                {/* Título Atualizado (sem +30 mil) */}
                <h2 className="text-2xl md:text-3xl font-extrabold leading-tight text-white drop-shadow-sm">
                  Crie seu <span className="text-yellow-300 underline decoration-yellow-300/40">cardápio digital</span> e comece a vender no <span className="font-black">WhatsApp</span>
                </h2>

                {/* Recursos / Benefícios */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm shadow-sm">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-snug">Sistema completo para o seu negócio</p>
                      <p className="text-xs text-white/80">Cardápio digital, pedidos WhatsApp e gestão fácil.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm shadow-sm">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-snug">Fácil de usar e suporte dedicado</p>
                      <p className="text-xs text-white/80">Configure em menos de 2 minutos sem complicação.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm shadow-sm">
                      <Cloud className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-snug">Rápido, simples e seguro</p>
                      <p className="text-xs text-white/80">Sem taxas por vendas. Você fica com 100% do lucro.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé informativo */}
              <div className="relative z-10 pt-6 mt-6 border-t border-white/20 text-[11px] text-white/80 flex items-center justify-between">
                <span>● Pleno funcionamento</span>
                <span>100% Grátis para testar</span>
              </div>
            </div>

            {/* Direita: Formulário */}
            <div className="md:col-span-7 p-6 md:p-8 bg-card flex flex-col justify-between relative">
              <div>
                <div className="mb-6">
                  <h3 className="text-2xl font-black tracking-tight text-foreground">
                    Teste Grátis o <span className="text-primary">Menuzin</span> agora
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie seu acesso grátis e conheça o Menuzin.
                  </p>
                </div>

                <form onSubmit={handleStep1Submit} className="space-y-4">
                  {/* Seu nome & WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Seu nome"
                          className="pl-10 h-11 bg-background"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                          placeholder="WhatsApp"
                          inputMode="tel"
                          maxLength={15}
                          className="pl-10 h-11 bg-background"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nome do negócio & E-mail */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <div className="relative">
                        <Utensils className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Nome do seu negócio"
                          className="pl-10 h-11 bg-background"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="E-mail"
                          className="pl-10 h-11 bg-background"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Senha */}
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                      <PasswordInput
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Senha de acesso (mín. 8 caracteres)"
                        className="pl-10 h-11 bg-background"
                        required
                      />
                    </div>
                  </div>

                  {/* Botão de Envio (Paleta Laranja) */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-3"
                    disabled={!step1Valid}
                  >
                    <span>TESTAR GRÁTIS »</span>
                  </Button>

                  {/* Checkbox de Aceite */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-muted-foreground leading-tight">
                      <Checkbox
                        checked={acceptTerms}
                        onCheckedChange={(v) => setAcceptTerms(!!v)}
                        className="mt-0.5 border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span>
                        Aceito receber e-mails de informações do Menuzin.{" "}
                        <a href="/privacidade" target="_blank" className="font-semibold text-foreground underline hover:text-primary">
                          Política de privacidade
                        </a>
                        .
                      </span>
                    </label>
                  </div>
                </form>
              </div>

              {/* Box de Segurança no Rodapé */}
              <div className="mt-6 rounded-xl border bg-muted/40 p-3 flex items-center gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background text-foreground shadow-xs">
                  <LockKeyhole className="h-4 w-4 text-primary" />
                </div>
                <div className="text-xs leading-tight">
                  <p className="font-bold text-foreground">Seus dados estão protegidos.</p>
                  <p className="text-muted-foreground">Não compartilhamos suas informações.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2: Tipo de Negócio (Anexo 2 com Paleta Menuzin) */}
        {step === 2 && (
          <div className="p-6 sm:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            <div>
              {/* Header do Wizard */}
              <div className="text-center mb-6">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary mb-3">
                  <Utensils className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Crie seu cardápio grátis</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Plano <strong>Presença</strong> — sem taxas, sem comissão. Você completa o resto depois.
                </p>
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                    1
                  </div>
                  <span className="text-xs font-semibold text-foreground">Tipo de negócio</span>
                </div>
                <div className="h-0.5 w-8 sm:w-16 bg-muted" />
                <div className="flex items-center gap-2 opacity-60">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground font-bold text-xs">
                    2
                  </div>
                  <span className="text-xs text-muted-foreground">Dados da loja</span>
                </div>
                <div className="h-0.5 w-8 sm:w-16 bg-muted" />
                <div className="flex items-center gap-2 opacity-60">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground font-bold text-xs">
                    3
                  </div>
                  <span className="text-xs text-muted-foreground">Sua conta</span>
                </div>
              </div>

              {/* Título da Seção */}
              <div className="mb-4">
                <h4 className="text-base font-bold text-foreground">Tipo de negócio</h4>
                <p className="text-xs text-muted-foreground">
                  Selecione um tipo. Por padrão, o novo tenant é criado vazio — você monta o cardápio depois.
                </p>
              </div>

              {/* Grid de Opções (2 colunas como Anexo 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                {BUSINESS_TYPES.map((t) => {
                  const isSelected = businessType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBusinessType(t)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm font-medium transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary font-semibold"
                          : "border-border bg-card hover:border-primary/50 text-foreground"
                      }`}
                    >
                      <div
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <span>{BUSINESS_TYPE_LABELS[t]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ações do Rodapé */}
            <div className="mt-8 pt-4 border-t flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>

              <Button type="button" onClick={handleStep2Next} disabled={!step2Valid} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                Avançar <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 3: Dados da Loja (Anexo 3 com Paleta Menuzin e Sem Repetições) */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="p-6 sm:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            <div>
              {/* Header do Wizard */}
              <div className="text-center mb-6">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary mb-3">
                  <Store className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Crie seu cardápio grátis</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Plano <strong>Presença</strong> — sem taxas, sem comissão. Você completa o resto depois.
                </p>
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-xs text-muted-foreground">Tipo de negócio</span>
                </div>
                <div className="h-0.5 w-8 sm:w-16 bg-primary" />
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                    2
                  </div>
                  <span className="text-xs font-semibold text-foreground">Dados da loja</span>
                </div>
                <div className="h-0.5 w-8 sm:w-16 bg-muted" />
                <div className="flex items-center gap-2 opacity-60">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground font-bold text-xs">
                    3
                  </div>
                  <span className="text-xs text-muted-foreground">Sua conta</span>
                </div>
              </div>

              {/* Formulário de Dados da Loja */}
              <div className="space-y-4">
                {/* Nome do Estabelecimento (Pré-preenchido do Step 1) */}
                <div>
                  <Label className="text-xs font-semibold">Nome do estabelecimento</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ex.: Pizzaria Napoli"
                    className="mt-1 h-10 bg-background"
                    required
                  />
                </div>

                {/* Endereço / Slug da Loja */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold">Endereço da sua loja</Label>
                    {computedSlug.length >= 3 && !slugChecking && (
                      slugOk ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> disponível
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-destructive font-semibold">
                          <XCircle className="h-3 w-3" /> em uso
                        </span>
                      )
                    )}
                  </div>
                  <div className="flex overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-primary">
                    <span className="inline-flex items-center bg-muted px-3 text-xs text-muted-foreground border-r font-mono">
                      menuzin.app/
                    </span>
                    <Input
                      value={computedSlug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugTouched(true);
                      }}
                      placeholder="sua-loja"
                      className="rounded-none border-0 font-mono text-xs focus-visible:ring-0 h-10"
                      required
                    />
                  </div>
                </div>

                {/* WhatsApp (Pré-preenchido do Step 1) & CEP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Label className="text-xs font-semibold">WhatsApp</Label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      inputMode="tel"
                      maxLength={15}
                      className="mt-1 h-10 bg-background"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">CEP</Label>
                    <Input
                      value={cep}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                        setCep(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
                      }}
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                      className="mt-1 h-10 bg-background"
                    />
                  </div>
                </div>

                {/* Rua / Avenida & Nº */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-3.5">
                  <div>
                    <Label className="text-xs font-semibold">Rua / Avenida</Label>
                    <Input
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ex.: Rua das Flores"
                      className="mt-1 h-10 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Nº</Label>
                    <Input
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
                      className="mt-1 h-10 bg-background"
                    />
                  </div>
                </div>

                {/* Bairro, Cidade & UF */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <Label className="text-xs font-semibold">Bairro</Label>
                    <Input
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Centro"
                      className="mt-1 h-10 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Cidade</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Sua cidade"
                      className="mt-1 h-10 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">UF</Label>
                    <Input
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      placeholder="PI"
                      maxLength={2}
                      className="mt-1 h-10 bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ações do Rodapé */}
            <div className="mt-8 pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </Button>

                <Button
                  type="submit"
                  disabled={signupMut.isPending}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold px-6"
                >
                  {signupMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                  <span>Concluir Cadastro »</span>
                </Button>
              </div>

              <p className="text-center text-[11px] text-muted-foreground pt-1">
                Sem cartão de crédito · Sem taxas sobre vendas · Cancele quando quiser
              </p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

