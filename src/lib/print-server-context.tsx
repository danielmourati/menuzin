// Provider global de conexão com o QZ Tray.
//
// Hoje a conexão é on-demand em vários pontos da UI (página de impressora,
// botão de imprimir do pedido). Cada uso refaz o handshake, o que custa
// 300-800ms quando tudo está OK e ~3s quando o usuário precisa confirmar
// o prompt manual. Esse provider mantém UMA conexão viva por sessão e
// expõe `ensureConnected()` para qualquer componente reutilizá-la.
//
// Opt-in por tenant: só conecta automaticamente quando
// `printer_settings.auto_connect === true`. Tenants existentes ficam com
// `false` (default) → comportamento idêntico ao atual (on-demand via
// ensureConnected do componente que precisa).
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { ensureQzConnected, QzNotRunningError } from "@/lib/qz-tray";
import { getMyPrinterSettings } from "@/lib/printer-settings.functions";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export type PrintServerStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "prompted"
  | "offline"
  | "error";

export type PrintServerState = {
  status: PrintServerStatus;
  error?: string;
  lastConnectMs?: number;
  ensureConnected: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const PrintServerContext = createContext<PrintServerState | undefined>(undefined);

export function PrintServerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: ["printer-settings"],
    queryFn: () => getMyPrinterSettings(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
  const autoConnect = data?.settings?.auto_connect === true;

  const [status, setStatus] = useState<PrintServerStatus>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastConnectMs, setLastConnectMs] = useState<number | undefined>(undefined);
  // Evita auto-conectar duas vezes em StrictMode / re-mount.
  const autoTriedRef = useRef(false);
  // Garante uma única promise em voo de connect().
  const inFlightRef = useRef<Promise<void> | null>(null);

  const connect = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;
    setStatus((s) => (s === "connected" ? s : "connecting"));
    setError(undefined);
    const promise = (async () => {
      const startedAt = performance.now();
      try {
        await ensureQzConnected();
        const ms = Math.round(performance.now() - startedAt);
        setLastConnectMs(ms);
        // Heurística usada em outros lugares do app: >2s ≈ prompt manual.
        setStatus(ms > 2000 ? "prompted" : "connected");
      } catch (e) {
        if (e instanceof QzNotRunningError) {
          setStatus("offline");
          setError(e.message);
        } else {
          setStatus("error");
          setError((e as Error).message);
        }
        throw e;
      } finally {
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = promise;
    return promise;
  }, []);

  const ensureConnected = useCallback(async () => {
    if (status === "connected" || status === "prompted") return;
    await connect();
  }, [connect, status]);

  const disconnect = useCallback(async () => {
    try {
      const qz = typeof window !== "undefined" ? window.qz : undefined;
      if (qz && qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
    } catch {
      /* ignore */
    } finally {
      setStatus("idle");
      setError(undefined);
      setLastConnectMs(undefined);
      autoTriedRef.current = false;
    }
  }, []);

  // Auto-conexão pós-login quando opt-in está ligado.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!autoConnect) return;
    if (autoTriedRef.current) return;
    if (status !== "idle") return;
    autoTriedRef.current = true;
    void connect().catch(() => { /* status já atualizado */ });
  }, [isAuthenticated, autoConnect, status, connect]);

  // Desconecta ao deslogar.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") void disconnect();
    });
    return () => subscription.unsubscribe();
  }, [disconnect]);

  const value = useMemo<PrintServerState>(
    () => ({ status, error, lastConnectMs, ensureConnected, connect, disconnect }),
    [status, error, lastConnectMs, ensureConnected, connect, disconnect],
  );

  return (
    <PrintServerContext.Provider value={value}>{children}</PrintServerContext.Provider>
  );
}

export function usePrintServer(): PrintServerState {
  const ctx = useContext(PrintServerContext);
  if (!ctx) {
    throw new Error("usePrintServer deve ser usado dentro de <PrintServerProvider>.");
  }
  return ctx;
}

/** Versão "safe" — devolve null fora do provider (útil em árvores legadas). */
export function useMaybePrintServer(): PrintServerState | null {
  return useContext(PrintServerContext) ?? null;
}
