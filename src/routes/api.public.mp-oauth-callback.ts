// Callback do OAuth do Mercado Pago (conexão automática por lojista).
// O Mercado Pago redireciona o popup para cá com ?code=...&state=...
import { createFileRoute } from "@tanstack/react-router";

function page(ok: boolean, message: string) {
  const payload = JSON.stringify({ type: ok ? "mpOAuthComplete" : "mpOAuthFailed", message });
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Mercado Pago</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;color:#111}
p{max-width:28rem;text-align:center;padding:0 1.5rem;line-height:1.5}</style></head>
<body><p>${message}</p>
<script>
  try { window.opener && window.opener.postMessage(${payload}, window.location.origin); } catch (e) {}
  setTimeout(function () { window.close(); }, ${ok ? 400 : 2500});
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/mp-oauth-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code || !state) {
          return page(false, "Conexão cancelada ou incompleta. Feche esta janela e tente novamente.");
        }

        try {
          const {
            consumeOAuthState,
            exchangeCodeForToken,
            persistOAuthConnection,
            resolveRedirectUri,
          } = await import("@/lib/mp-oauth.server");

          const tenantId = await consumeOAuthState(state);
          const token = await exchangeCodeForToken(code, resolveRedirectUri(request.url));
          await persistOAuthConnection(tenantId, token);
          return page(true, "Conta Mercado Pago conectada! Você já pode fechar esta janela.");
        } catch (err) {
          console.error("[mp-oauth-callback]", err);
          return page(false, "Não foi possível concluir a conexão com o Mercado Pago. Tente novamente.");
        }
      },
    },
  },
});
