import { Outlet, createFileRoute } from "@tanstack/react-router";

// Layout do painel: define o atalho/app próprio do painel (abre no login).
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ name: "apple-mobile-web-app-title", content: "Menuzin Painel" }],
    links: [{ rel: "manifest", href: "/api/public/manifest-admin" }],
  }),
  component: () => <Outlet />,
});
