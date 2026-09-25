import { createFileRoute, redirect } from "@tanstack/react-router";

// O Guia Menuzin agora é a página inicial — /guia redireciona para /.
export const Route = createFileRoute("/guia/")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301, replace: true });
  },
  component: () => null,
});
