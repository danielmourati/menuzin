## Escopo

Implementar os itens 3, 4 e 5 da comparação com o plano de referência, mantendo o que já funciona hoje (rota `/api/public/qz` continua válida, fluxo on-demand continua suportado).

---

## 3) Servir `qz-cert.crt` como arquivo estático em `/qz-cert.crt`

**Problema:** hoje o cert só vem via `GET /api/public/qz` (JSON `{cert, configured, subjectCN}`). O plano de referência espera um arquivo PEM cru em `/qz-cert.crt` — útil para:
- Configurar `override.crt` no QZ Tray sem precisar fazer parse de JSON.
- Permitir `curl https://menuzin.lovable.app/qz-cert.crt -o override.crt` direto no instalador `.bat`.
- Compatibilidade com docs/scripts terceiros que esperam esse caminho.

**Por que não usar `public/qz-cert.crt`:** o cert vem de `QZ_CERT_PEM` (env), não está versionado. Tem que ser gerado em runtime.

**Implementação:**
- Nova rota server: `src/routes/api.public.qz-cert[.]crt.ts` (colchetes escapam o ponto no nome do arquivo gerado).
  - Caminho final: `/api/public/qz-cert.crt`.
  - `GET` retorna `cfg.cert` (do `getConfig()` já existente em `api.public.qz.ts`) com `Content-Type: application/x-pem-file` e `Content-Disposition: attachment; filename="qz-cert.crt"`.
  - Se `!cfg.ok`, retorna `503` com texto explicativo (não JSON — clientes esperam PEM).
- Para evitar duplicar `getConfig()`, **extrair** essa função e `normalizePem`/`extractCN` para `src/lib/qz-config.server.ts` e importar nas duas rotas (`api.public.qz.ts` e `api.public.qz-cert[.]crt.ts`).
- Atualizar o instalador `.bat` em `src/lib/qz-tray.ts` (`QZ_INSTALL_PS1`) para baixar o cert via `Invoke-WebRequest` em `/api/public/qz-cert.crt` em vez do JSON.
- Atualizar `QzInstallGuide.tsx` (passo manual) para mencionar o link direto `/api/public/qz-cert.crt`.

**Fora de escopo:** mudar o caminho `/api/public/qz` — continua existindo para o cliente JS que precisa do JSON.

---

## 4) Edge Function `qz-sign` em paralelo à rota TanStack

**Decisão:** **NÃO migrar**, **adicionar como fallback opcional**.

**Por quê:**
- A rota TanStack `/api/public/qz` funciona, valida par cert/chave, bloqueia cert demo e está com logs. Migrar tudo para Edge Function é regressão (perde o `getConfig()` cacheado, perde validação de par cert/chave).
- O plano de referência cita Edge Function porque assume Supabase puro. Aqui temos TanStack Start — a rota TanStack é o equivalente nativo.
- Mas alguns deploys (ex.: cliente roda QZ Tray em rede que bloqueia o domínio `lovable.app` mas não `*.supabase.co`) podem precisar de URL alternativa.

**Implementação mínima:**
- Criar `supabase/functions/qz-sign/index.ts` espelhando `api.public.qz.ts`:
  - `GET` → `{cert, configured, subjectCN}` (mesma shape).
  - `POST {request}` → `{signature, configured}`.
  - Usa `Deno.env.get("QZ_CERT_PEM" | "QZ_PRIVATE_KEY_PEM")`.
  - `crypto.subtle.importKey('pkcs8', …)` + `sign('RSASSA-PKCS1-v1_5'+SHA-512)`.
  - Mesma validação de cert demo e de par cert/chave.
  - CORS aberto (precisa para chamada cross-origin do front).
- Adicionar bloco no `supabase/config.toml`:
  ```toml
  [functions.qz-sign]
  verify_jwt = false
  ```
- **Não trocar** o client (`src/lib/qz-tray.ts`) para usar Edge Function por padrão. Adicionar uma constante `QZ_SIGN_ENDPOINT` em `src/lib/qz-tray.ts` apontando para `/api/public/qz` (default) — se no futuro precisarmos trocar, é uma linha.
- Documentar no header da Edge Function que ela existe como fallback e que a rota TanStack é a primária.

**Risco:** chave privada duplicada em dois endpoints. Mitigação: mesmo secret `QZ_PRIVATE_KEY_PEM`, sem segredo novo, sem nova superfície de ataque.

---

## 5) `PrintServerContext` + auto-conexão pós-login

**Decisão:** criar `PrintServerProvider` global, mas **com opt-in por tenant**.

**Por quê:**
- Hoje a conexão é on-demand em 2 lugares (`admin.configuracoes.impressora.tsx` e `PrintOrderButton`). Cada uso refaz handshake (~300-800ms sem prompt, ~3s com prompt) — ruim quando o admin imprime vários pedidos seguidos no Kanban.
- Auto-conectar todo mundo no login é exagero: nem todo tenant tem impressora térmica, nem todo admin que loga vai imprimir.
- Solução: provider global, mas só conecta se `printer_settings.auto_connect === true` (nova flag, default `false`).

**Implementação:**

**a) Tipo + migração:**
- Adicionar coluna `auto_connect boolean not null default false` em `printer_settings` (migração).
- Adicionar `auto_connect: boolean` em `PrinterSettings` (`src/lib/printer-types.ts`) e `DEFAULT_PRINTER_SETTINGS`.
- Adicionar toggle "Conectar automaticamente ao QZ Tray ao logar" em `admin.configuracoes.impressora.tsx`.

**b) Context:**
- Novo arquivo `src/lib/print-server-context.tsx`:
  ```tsx
  type PrintServerState = {
    status: "idle" | "connecting" | "connected" | "error" | "prompted";
    error?: string;
    lastConnectMs?: number;
    fingerprint?: string;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    ensureConnected: () => Promise<void>; // idempotente, usado pelo PrintOrderButton
  };
  ```
- `PrintServerProvider`:
  - Lê `printer_settings` via `useQuery` (mesma queryKey `["printer-settings"]` já usada — cache compartilhado).
  - Se `isAuthenticated && settings.auto_connect && status === "idle"`, dispara `connect()` em `useEffect`.
  - `connect()` chama `ensureQzConnection()` (já existe em `src/lib/qz-tray.ts`), mede latência, atualiza `qz:trust-state` no localStorage (chave já usada no diagnóstico), atualiza `status`.
  - `disconnect()` chama `qz.websocket.disconnect()` ao deslogar (`onAuthStateChange` SIGNED_OUT).
  - `ensureConnected()`: se já `connected`, no-op; senão chama `connect()`.

**c) Wiring:**
- Envolver `<PrintServerProvider>` dentro de `<AuthProvider>` no `__root.tsx` (ou onde `AuthProvider` for montado).
- `PrintOrderButton`: trocar chamada direta de `ensureQzConnection` por `usePrintServer().ensureConnected()` antes de imprimir — assim reusa a conexão aberta.
- `admin.configuracoes.impressora.tsx`: substituir estado local de conexão pelo context (`status`, `lastConnectMs`, `fingerprint`), mantendo todos os botões existentes (Detectar, Teste de conexão, Resolver prompt, Diagnóstico, etc.).
- O modal de diagnóstico (`QzDiagnosticsModal`) passa a ler `status` do context em tempo real.

**d) Não-regressão:**
- Tenants existentes ficam com `auto_connect = false` → comportamento idêntico ao atual (on-demand).
- Nenhuma rota muda. Nenhum endpoint novo no backend (além do item 3/4).

---

## Detalhes técnicos

| Item | Arquivo novo | Arquivos editados |
|---|---|---|
| 3 | `src/routes/api.public.qz-cert[.]crt.ts`, `src/lib/qz-config.server.ts` | `src/routes/api.public.qz.ts` (usar helper), `src/lib/qz-tray.ts` (instalador `.bat`), `src/components/printer/QzInstallGuide.tsx` |
| 4 | `supabase/functions/qz-sign/index.ts` | `supabase/config.toml` (bloco `[functions.qz-sign]`), `src/lib/qz-tray.ts` (constante `QZ_SIGN_ENDPOINT`) |
| 5 | `src/lib/print-server-context.tsx` + migração SQL (`auto_connect`) | `src/lib/printer-types.ts`, `src/routes/__root.tsx`, `src/routes/admin.configuracoes.impressora.tsx`, `src/components/orders/PrintOrderButton.tsx`, `src/components/printer/QzDiagnosticsModal.tsx` |

**Migração SQL (item 5):**
```sql
alter table public.printer_settings
  add column if not exists auto_connect boolean not null default false;
```
(sem mudança de RLS — coluna nova na tabela já existente.)

**Segurança:** nada muda. `/api/public/qz` e `/api/public/qz-cert.crt` permanecem públicos por design (QZ Tray precisa do cert; assinatura usa chave privada que nunca sai do servidor). A questão de proteger POST `/api/public/qz` com auth ficou fora deste plano (era item 1 da divergência).

---

## Fora de escopo

- Item 1 (proteger POST `/api/public/qz` com Bearer/tenant).
- Item 2 (docs OpenSSL no repo).
- macOS/Linux installer.
- Trocar par cert/chave atual.
