import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  Award,
  X,
  LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";
import { maskPhone } from "@/lib/masks";
import { signupPresencaTenant } from "@/lib/signup.functions";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import { useNavigate } from "@tanstack/react-router";

export function QuickSignupModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [pendingEmail, setPendingEmail] = useState("");

  // Form State
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Customer Status: "nao" (default) or "sim" (redirects to login)
  const [customerStatus, setCustomerStatus] = useState<"sim" | "nao">("nao");

  // Accept Terms Checkbox
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setPendingEmail("");
      setFullName("");
      setWhatsapp("");
      setBusinessName("");
      setEmail("");
      setPassword("");
      setCustomerStatus("nao");
      setAcceptTerms(true);
    }
  }, [open]);

  // When user selects "Sou cliente", redirect to login
  const handleCustomerStatusChange = (status: "sim" | "nao") => {
    setCustomerStatus(status);
    if (status === "sim") {
      onOpenChange(false);
      navigate({ to: "/admin/login" });
    }
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    fullName.trim().length >= 2 &&
    whatsapp.replace(/\D/g, "").length >= 10 &&
    businessName.trim().length >= 2 &&
    emailValid &&
    password.length >= 8 &&
    acceptTerms;

  const signupMut = useMutation({
    mutationFn: async () => {
      const result = await signupPresencaTenant({
        data: {
          name: businessName.trim(),
          full_name: fullName.trim(),
          whatsapp: whatsapp.replace(/\D/g, ""),
          email: email.trim().toLowerCase(),
          password: password,
          business_type: "restaurante",
        },
      });

      // Dispara o e-mail de confirmação de cadastro apontando para o painel admin.
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
      toast.success("Cadastro realizado! Verifique seu e-mail para ativar sua conta.");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Informe seu nome completo.");
    if (whatsapp.replace(/\D/g, "").length < 10) return toast.error("Informe um WhatsApp válido com DDD.");
    if (!businessName.trim()) return toast.error("Informe o nome do seu negócio.");
    if (!emailValid) return toast.error("Informe um e-mail válido.");
    if (password.length < 8) return toast.error("A senha deve ter no mínimo 8 caracteres.");
    if (!acceptTerms) return toast.error("Aceite os termos para continuar.");

    signupMut.mutate();
  };

  // Tela de Aguardando Confirmação por E-mail
  if (pendingEmail) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-6 sm:p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mb-4">
            <Mail className="h-8 w-8 animate-pulse" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">Confirme seu e-mail</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground mt-2">
            Enviamos um link de ativação para <strong className="text-foreground">{pendingEmail}</strong>.
            <br />
            Clique no link recebido para confirmar seu cadastro e ser redirecionado para a sua <strong>área de admin</strong>.
          </DialogDescription>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl border bg-muted/30 p-3.5 text-xs text-muted-foreground text-center">
              Não encontrou o e-mail? Verifique a caixa de <strong>Spam</strong> ou <strong>Lixo eletrônico</strong>.
            </div>

            <Button
              variant="outline"
              className="w-full h-11 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => resendMut.mutate()}
              disabled={resendMut.isPending}
            >
              {resendMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Reenviar e-mail de confirmação
            </Button>

            <Button
              className="w-full h-11 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold shadow-md hover:from-red-700 hover:to-rose-700"
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
        <DialogTitle className="sr-only">Teste Grátis o Menuzin agora</DialogTitle>
        <DialogDescription className="sr-only">Crie seu acesso grátis e conheça o Menuzin.</DialogDescription>

        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
          {/* Esquerda: Banner / Prova Social Menuzin */}
          <div className="md:col-span-5 bg-gradient-to-br from-red-600 via-red-700 to-rose-800 text-white p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Efeitos visuais decorativos */}
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-black/20 blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* Selo / Badge "Aprovado +30 mil" */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur-md border border-white/20">
                <Award className="h-5 w-5 text-yellow-300 fill-yellow-300/30" />
                <span className="text-xs font-bold tracking-wide uppercase text-white/95">
                  APROVADO · +30 MIL RESTAURANTES
                </span>
              </div>

              {/* Título da Prova Social */}
              <h2 className="text-2xl md:text-3xl font-extrabold leading-tight text-white drop-shadow-sm">
                Mais de <span className="text-yellow-300 underline decoration-yellow-300/40">30 mil</span> restaurantes já escolheram o <span className="font-black">Menuzin</span>
              </h2>

              {/* Lista de Recursos / Benefícios com ícones estilizados */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm shadow-sm">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-snug">Sistema completo para o seu restaurante</p>
                    <p className="text-xs text-white/80">Cardápio digital, pedidos WhatsApp e gestão fácil.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm shadow-sm">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-snug">Fácil de usar e com suporte especializado</p>
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

            {/* Rodapé informativo do banner */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/20 text-[11px] text-white/75 flex items-center justify-between">
              <span>● Pleno funcionamento</span>
              <span>100% Grátis para testar</span>
            </div>
          </div>

          {/* Direita: Formulário de Autocadastro */}
          <div className="md:col-span-7 p-6 md:p-8 bg-card flex flex-col justify-between relative">
            {/* Botão de Fechar no canto superior direito */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              {/* Header do Formulário */}
              <div className="mb-6">
                <h3 className="text-2xl font-black tracking-tight text-foreground">
                  Teste Grátis o <span className="text-red-600 dark:text-red-500">Menuzin</span> agora
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie seu acesso grátis e conheça o Menuzin.
                </p>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Linha 1: Seu nome & WhatsApp */}
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

                {/* Linha 2: Nome do negócio & E-mail */}
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

                {/* Campo de Senha (para a conta de login) */}
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

                {/* Pergunta: Já é nosso cliente? */}
                <div className="pt-2">
                  <p className="text-xs font-bold text-foreground mb-2">Já é nosso cliente?</p>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <input
                        type="radio"
                        name="customer_status"
                        checked={customerStatus === "sim"}
                        onChange={() => handleCustomerStatusChange("sim")}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 accent-red-600"
                      />
                      <span>Sou cliente</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <input
                        type="radio"
                        name="customer_status"
                        checked={customerStatus === "nao"}
                        onChange={() => handleCustomerStatusChange("nao")}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 accent-red-600"
                      />
                      <span>Não, quero conhecer</span>
                    </label>
                  </div>
                </div>

                {/* Botão de Envio: TESTAR GRÁTIS » */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold text-base shadow-lg shadow-red-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-3"
                  disabled={!canSubmit || signupMut.isPending}
                >
                  {signupMut.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <span>TESTAR GRÁTIS »</span>
                  )}
                </Button>

                {/* Checkbox de Aceite e Privacidade */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-muted-foreground leading-tight">
                    <Checkbox
                      checked={acceptTerms}
                      onCheckedChange={(v) => setAcceptTerms(!!v)}
                      className="mt-0.5 border-muted-foreground/40 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                    <span>
                      Aceito receber e-mails de informações do Menuzin.{" "}
                      <a href="/privacidade" target="_blank" className="font-semibold text-foreground underline hover:text-red-600">
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
                <LockKeyhole className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-xs leading-tight">
                <p className="font-bold text-foreground">Seus dados estão protegidos.</p>
                <p className="text-muted-foreground">Não compartilhamos suas informações.</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
