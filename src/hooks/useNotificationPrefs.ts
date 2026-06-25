import { useState, useEffect } from "react";
import { setAlertSoundOverride } from "@/lib/order-alert-sound";

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

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(readPrefs);

  // Sincroniza som customizado com o módulo de áudio
  useEffect(() => {
    setAlertSoundOverride(prefs.customAlertDataUrl ?? null);
  }, [prefs.customAlertDataUrl]);

  const updatePrefs = (newPrefs: Partial<NotificationPrefs>) => {
    setPrefs((current) => {
      const updated = { ...current, ...newPrefs };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Erro ao salvar preferências de notificação", e);
      }
      return updated;
    });
  };

  return { prefs, updatePrefs };
}
