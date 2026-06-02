import { useSyncExternalStore } from "react";

const KEY = "active-tenant-id";
const listeners = new Set<() => void>();

export function getActiveTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveTenantId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function clearActiveTenant() {
  setActiveTenantId(null);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useActiveTenantId(): string | null {
  return useSyncExternalStore(subscribe, getActiveTenantId, () => null);
}
