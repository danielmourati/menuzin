import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("lojista@burgerprime.com");
  const [pwd, setPwd] = useState("demo1234");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden gradient-brand lg:flex lg:flex-col lg:justify-between p-12 text-primary-foreground">
        <Link to="/" className="flex items-center gap-2 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur font-bold">F</div>
          <span className="font-display text-lg font-bold">FoodCatálogo</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight text-balance">
            Receba pedidos no WhatsApp e organize tudo em um só lugar.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/85">
            Painel completo para gerenciar produtos, categorias, pedidos e a aparência da sua loja.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">© FoodCatálogo</p>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">Entrar no painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse sua loja FoodCatálogo</p>
          <form
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/admin/dashboard" }); }}
            className="mt-6 space-y-4"
          >
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Senha</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1.5" /></div>
            <Button type="submit" className="h-11 w-full">Entrar</Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">Demonstração com dados mockados.</p>
        </div>
      </div>
    </div>
  );
}
