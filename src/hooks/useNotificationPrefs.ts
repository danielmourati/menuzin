import { useState, useEffect } from "react";
import { setAlertSoundOverride } from "@/lib/order-alert-sound";
import { getMyTenant } from "@/lib/tenants.functions";

export interface NotificationPrefs {
  soundEnabled: boolean;
  toastEnabled: boolean;
  highlightNew: boolean;
  customAlertDataUrl?: string | null;
  customAlertName?: string | null;
}

const DEFAULT_PREFS: NotificationPrefs = {
  soundEnabled: true,
  toastEnabled: true,
  highlightNew: true,
  customAlertDataUrl: null,
  customAlertName: null,
};

const STORAGE_KEY = "menuzin_notification_prefs";
let tenantSoundSynced = false;

function readPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: NotificationPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Erro ao salvar preferências de notificação", e);
  }
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(readPrefs);

  // Sincroniza som customizado com o módulo de áudio
  useEffect(() => {
    setAlertSoundOverride(prefs.customAlertDataUrl ?? null);
  }, [prefs.customAlertDataUrl]);

  // Carrega o som personalizado salvo no banco (persistência cross-browser)
  useEffect(() => {
    if (tenantSoundSynced) return;
    tenantSoundSynced = true;
    let cancelled = false;
    (async () => {
      try {
        const { tenant } = await getMyTenant();
        if (cancelled || !tenant) return;
        const url = (tenant as { notification_sound_url?: string | null }).notification_sound_url ?? null;
        const name = (tenant as { notification_sound_name?: string | null }).notification_sound_name ?? null;
        setPrefs((current) => {
          if (current.customAlertDataUrl === url && current.customAlertName === name) {
            return current;
          }
          const updated = { ...current, customAlertDataUrl: url, customAlertName: name };
          writePrefs(updated);
          return updated;
        });
      } catch {
        // silencioso: usuário pode não estar logado em rota pública
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = (newPrefs: Partial<NotificationPrefs>) => {
    setPrefs((current) => {
      const updated = { ...current, ...newPrefs };
      writePrefs(updated);
      return updated;
    });
  };

  return { prefs, updatePrefs };
}
