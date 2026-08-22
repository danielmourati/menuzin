// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server-side env (no VITE_ prefix) must be available to server routes such as
// the email queue processor. These are NOT injected into the client bundle.
const serverEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
// Nunca sobrescrever variáveis já presentes no ambiente (build de produção do Lovable).
for (const [key, value] of Object.entries(serverEnv)) {
  if (process.env[key] === undefined || process.env[key] === "") process.env[key] = value;
}

// Config pública do backend: garantimos a injeção no bundle do cliente mesmo quando o
// ambiente de build não expõe nenhuma das variáveis (caso do deploy publicado).
// Os valores abaixo são públicos por definição (URL + chave publicável/anon) — nenhuma
// chave de serviço entra no bundle do cliente.
const FALLBACK_SUPABASE_URL = "https://fetiqngwjgxajtqjaolb.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldGlxbmd3amd4YWp0cWphb2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjY5NDksImV4cCI6MjA5NTkwMjk0OX0.u7YQo3y2GaIWPgeA7dBvC05huAkUdx-i5xqaqdyu8Is";
const FALLBACK_SUPABASE_PROJECT_ID = "fetiqngwjgxajtqjaolb";

const pickEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return "";
};

const publicSupabaseUrl =
  pickEnv("VITE_SUPABASE_URL", "SUPABASE_URL") || FALLBACK_SUPABASE_URL;
const publicSupabaseKey =
  pickEnv(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  ) || FALLBACK_SUPABASE_PUBLISHABLE_KEY;
const publicSupabaseProjectId =
  pickEnv("VITE_SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_ID") || FALLBACK_SUPABASE_PROJECT_ID;

const publicDefines: Record<string, string> = {
  "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicSupabaseUrl),
  "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicSupabaseKey),
  "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(publicSupabaseProjectId),
};


export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: publicDefines,
    resolve: {
      alias: {
        // React Email's htmlparser2 path needs entities v4.5.0; force the hoisted copy.
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
});
