import { useState } from "react";

export interface NotificationPrefs {
  soundEnabled: boolean;
  toastEnabled: boolean;
  highlightNew: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  soundEnabled: true,
  toastEnabled: true,
  highlightNew: true,
};

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    try {
      const stored = localStorage.getItem("menuzin_notification_prefs");
      return stored ? JSON.parse(stored) : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const updatePrefs = (newPrefs: Partial<NotificationPrefs>) => {
    setPrefs((current) => {
      const updated = { ...current, ...newPrefs };
      try {
        localStorage.setItem("menuzin_notification_prefs", JSON.stringify(updated));
      } catch (e) {
        console.error("Erro ao salvar preferências de notificação", e);
      }
      return updated;
    });
  };

  return { prefs, updatePrefs };
}
