// Arquivamento local (por dispositivo) de mensagens e notificações do Guia.
// Nada é apagado no servidor: guardamos apenas os IDs ocultos no localStorage.
import { useCallback, useEffect, useState } from "react";

const PREFIX = "guia:inbox:dismissed:";

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function useDismissed(key: string) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read(key));
  }, [key]);

  const persist = useCallback(
    (next: string[]) => {
      setIds(next);
      try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(next));
      } catch {
        /* storage indisponível */
      }
    },
    [key],
  );

  const dismiss = useCallback(
    (id: string) => persist(Array.from(new Set([...read(key), id]))),
    [key, persist],
  );

  const dismissAll = useCallback(
    (list: string[]) => persist(Array.from(new Set([...read(key), ...list]))),
    [key, persist],
  );

  const restore = useCallback(() => persist([]), [persist]);

  const isDismissed = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, dismiss, dismissAll, restore, isDismissed, hasDismissed: ids.length > 0 };
}
