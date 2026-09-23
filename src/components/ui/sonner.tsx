import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function isStorefrontPath(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.toLowerCase();
  // Admin, Platform, Guia, Meus Pedidos, Minha Conta, Landing Page não são storefront
  if (
    p.startsWith("/admin") ||
    p.startsWith("/platform") ||
    p.startsWith("/guia") ||
    p.startsWith("/meus-pedidos") ||
    p.startsWith("/minha-conta") ||
    p.startsWith("/comece-agora") ||
    p.startsWith("/api") ||
    p === "/" ||
    p === ""
  ) {
    return false;
  }
  return true;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const [isStorefront, setIsStorefront] = useState(false);

  useEffect(() => {
    setIsStorefront(isStorefrontPath());
    const checkPath = () => setIsStorefront(isStorefrontPath());
    window.addEventListener("popstate", checkPath);
    return () => window.removeEventListener("popstate", checkPath);
  }, []);

  if (isStorefront) return null;

  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
