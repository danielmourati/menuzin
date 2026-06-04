// Cálculo de status aberta/fechada da loja com base no horário programado.
// Roda no fuso America/Sao_Paulo (fixo) e é puro/isomórfico — pode ser usado
// tanto em server fn quanto em componente client.

export type WeekdayCode = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=domingo, 1=segunda, ..., 6=sábado

export type HoursDay = {
  weekday: WeekdayCode;
  enabled: boolean;
  open: string;  // "HH:MM"
  close: string; // "HH:MM"
};

export type HoursSchedule = HoursDay[];

export type OpenMode = "auto" | "open" | "closed";

export const WEEKDAY_LABELS: Record<WeekdayCode, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

/** Ordem de exibição (Segunda → Domingo). */
export const WEEKDAY_ORDER: WeekdayCode[] = [1, 2, 3, 4, 5, 6, 0];

export function defaultSchedule(): HoursSchedule {
  return WEEKDAY_ORDER.map<HoursDay>((w) => ({
    weekday: w,
    enabled: true,
    open: "18:00",
    close: "23:00",
  }));
}

/** Garante 7 entradas válidas a partir de uma fonte (possivelmente vazia). */
export function normalizeSchedule(input: unknown): HoursSchedule {
  const map = new Map<WeekdayCode, HoursDay>();
  if (Array.isArray(input)) {
    for (const raw of input) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      const w = Number(r.weekday);
      if (!Number.isInteger(w) || w < 0 || w > 6) continue;
      map.set(w as WeekdayCode, {
        weekday: w as WeekdayCode,
        enabled: !!r.enabled,
        open: typeof r.open === "string" && /^\d{2}:\d{2}$/.test(r.open) ? r.open : "18:00",
        close: typeof r.close === "string" && /^\d{2}:\d{2}$/.test(r.close) ? r.close : "23:00",
      });
    }
  }
  return WEEKDAY_ORDER.map(
    (w) => map.get(w) ?? { weekday: w, enabled: false, open: "18:00", close: "23:00" },
  );
}

/** Retorna {weekday, minutes} no fuso America/Sao_Paulo. */
function nowInSaoPaulo(now: Date = new Date()): { weekday: WeekdayCode; minutes: number } {
  // Usa Intl para extrair partes no fuso correto sem libs externas.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, WeekdayCode> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return { weekday: map[wd] ?? 0, minutes: (hh % 24) * 60 + (mm % 60) };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  return (h % 24) * 60 + (m % 60);
}

export type StoreOpenInput = {
  /** Modo do admin: auto | open | closed. */
  openMode?: OpenMode | null;
  /** Schedule estruturado (ou vazio). */
  hoursSchedule?: HoursSchedule | unknown;
  /** Fallback legado quando o tenant ainda não tem schedule. */
  legacyOpen?: boolean | null;
};

export type StoreOpenResult = {
  open: boolean;
  mode: OpenMode;
  /** Texto curto para tooltip/badge ("Auto: aberta até 23:00"). */
  reason: string;
};

export function computeStoreOpen(t: StoreOpenInput, now: Date = new Date()): StoreOpenResult {
  const mode: OpenMode = t.openMode === "open" || t.openMode === "closed" ? t.openMode : "auto";
  if (mode === "open") {
    return { open: true, mode, reason: "Forçada aberta pelo admin" };
  }
  if (mode === "closed") {
    return { open: false, mode, reason: "Forçada fechada pelo admin" };
  }
  const schedule = normalizeSchedule(t.hoursSchedule);
  const hasAnyEnabled = schedule.some((d) => d.enabled);
  if (!hasAnyEnabled) {
    // Sem horário programado: cai no toggle legado.
    const legacy = !!t.legacyOpen;
    return {
      open: legacy,
      mode,
      reason: legacy
        ? "Sem horário programado — usando toggle manual (aberta)"
        : "Sem horário programado — usando toggle manual (fechada)",
    };
  }
  const { weekday, minutes } = nowInSaoPaulo(now);
  const today = schedule.find((d) => d.weekday === weekday);
  if (!today || !today.enabled) {
    return { open: false, mode, reason: `${WEEKDAY_LABELS[weekday]}: fechada o dia todo` };
  }
  const openMin = toMinutes(today.open);
  const closeMin = toMinutes(today.close);
  // Janela "normal" mesmo dia. Se close <= open, ignora (config inválida).
  if (closeMin <= openMin) {
    return { open: false, mode, reason: `${WEEKDAY_LABELS[weekday]}: horário inválido` };
  }
  if (minutes >= openMin && minutes < closeMin) {
    return { open: true, mode, reason: `Aberta até ${today.close}` };
  }
  if (minutes < openMin) {
    return { open: false, mode, reason: `Abre às ${today.open}` };
  }
  return { open: false, mode, reason: `Fechou às ${today.close}` };
}
