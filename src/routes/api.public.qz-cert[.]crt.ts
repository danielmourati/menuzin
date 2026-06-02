// Serve o certificado público do QZ Tray como PEM cru em
// /api/public/qz-cert.crt. Útil para o instalador .bat baixar via
// `Invoke-WebRequest` sem precisar parsear JSON, e para qualquer ferramenta
// que espere um arquivo .crt no padrão X.509.
import { createFileRoute } from "@tanstack/react-router";
import { getQzConfig } from "@/lib/qz-config.server";

export const Route = createFileRoute("/api/public/qz-cert.crt")({
  server: {
    handlers: {
      GET: async () => {
        const cfg = getQzConfig();
        if (!cfg.ok) {
          return new Response(`# QZ Tray certificate unavailable: ${cfg.reason}\n`, {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        return new Response(cfg.cert, {
          status: 200,
          headers: {
            "Content-Type": "application/x-pem-file",
            "Content-Disposition": 'attachment; filename="qz-cert.crt"',
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
