import { useState, useEffect } from "react";
import { setAlertSoundOverride, ALERT_SOUND_URL } from "@/lib/order-alert-sound";

export interface NotificationPrefs {
  soundEnabled: boolean;
  toastEnabled: boolean;
  highlightNew: boolean;
  customAlertDataUrl?: string | null;
  customAlertName?: string | null;
}

// Som padrão global (fixo para todos os tenants).
const GLOBAL_ALERT_URL = ALERT_SOUND_URL;
const GLOBAL_ALERT_NAME = "Som padrão Menuzin";

const DEFAULT_PREFS: NotificationPrefs = {
  soundEnabled: true,
  toastEnabled: true,
  highlightNew: true,
  customAlertDataUrl: GLOBAL_ALERT_URL,
  customAlertName: GLOBAL_ALERT_NAME,
};

const STORAGE_KEY = "menuzin_notification_prefs";

function readPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const base = stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
    // Força o som global, ignorando qualquer override salvo por tenant/usuário.
    return { ...base, customAlertDataUrl: GLOBAL_ALERT_URL, customAlertName: GLOBAL_ALERT_NAME };
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

  // Trava o som global no player.
  useEffect(() => {
    setAlertSoundOverride(GLOBAL_ALERT_URL);
  }, []);

  const updatePrefs = (newPrefs: Partial<NotificationPrefs>) => {
    setPrefs((current) => {
      const updated = {
        ...current,
        ...newPrefs,
        // som é fixo: ignora tentativas de sobrescrever
        customAlertDataUrl: GLOBAL_ALERT_URL,
        customAlertName: GLOBAL_ALERT_NAME,
      };
      writePrefs(updated);
      return updated;
    });
  };

  return { prefs, updatePrefs };
}
