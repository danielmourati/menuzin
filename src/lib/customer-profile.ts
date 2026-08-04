// Universal (cross-tenant) customer profile cache.
// Source of truth is the backend keyed by phone; this is only convenience/cache.
import { useSyncExternalStore } from "react";

export type StoredAddress = {
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  complement?: string | null;
  reference?: string | null;
};

export type CustomerProfile = {
  id?: string | null;
  phone: string;
  token?: string | null;
  name?: string | null;
  email?: string | null;
  birthdate?: string | null;
  cepAsked?: boolean;
  cep?: string | null;
  city?: string | null;
  uf?: string | null;
  neighborhood?: string | null;
  address?: StoredAddress | null;
  ordersCount?: number;
  updatedAt?: string;
};

const KEY = "menuzin:customer:v1";
const listeners = new Set<() => void>();
let cached: CustomerProfile | null | undefined;

function emit() {
  cached = undefined;
  listeners.forEach((l) => l());
}

export function readCustomerProfile(): CustomerProfile | null {
  if (typeof window === "undefined") return null;
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as CustomerProfile) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function writeCustomerProfile(patch: Partial<CustomerProfile>) {
  if (typeof window === "undefined") return;
  const prev = readCustomerProfile();
  const next: CustomerProfile = {
    ...(prev ?? { phone: "" }),
    ...patch,
    address: patch.address ?? prev?.address ?? null,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  emit();
}

export function clearCustomerProfile() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** SSR-safe reactive read of the local profile. */
export function useCustomerProfile(): CustomerProfile | null {
  return useSyncExternalStore(subscribe, readCustomerProfile, () => null);
}

export const markCepAsked = () => writeCustomerProfile({ cepAsked: true });

export const hasSavedProfile = (p: CustomerProfile | null) => !!p?.phone && !!p?.name;
