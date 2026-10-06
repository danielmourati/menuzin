// Geração e validação de horários para pedidos agendados.
// Fuso fixo America/Sao_Paulo (UTC-3, sem horário de verão desde 2019).
import { normalizeSchedule } from "@/lib/store-hours";

const OFFSET_MS = 3 * 60 * 60 * 1000;
const WEEK_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const WEEK_LONG = ["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."];
const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

export type SchedulingConfig = {
  hoursSchedule: unknown;
  slotMinutes?: number | null;
  daysAhead?: number | null;
  /** Antecedência mínima (min) a partir de agora. */
  leadMinutes?: number | null;
};

export type Slot = { start: string; end: string; label: string };
export type SlotDay = { key: string; weekdayShort: string; day: number; isToday: boolean; slots: Slot[] };

/** "Relógio" de São Paulo representado num Date com campos UTC. */
function spClock(d: Date) {
  return new Date(d.getTime() - OFFSET_MS);
}
function fromSpClock(d: Date) {
  return new Date(d.getTime() + OFFSET_MS);
}
const pad = (n: number) => String(n).padStart(2, "0");
const hm = (d: Date) => `${pad(d.getUTCHours())}h${pad(d.getUTCMinutes())}`;
const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export function buildSlotDays(cfg: SchedulingConfig, now: Date = new Date()): SlotDay[] {
  const slot = Math.max(5, cfg.slotMinutes ?? 10);
  const daysAhead = Math.max(0, cfg.daysAhead ?? 7);
  const lead = Math.max(0, cfg.leadMinutes ?? 30);
  const schedule = normalizeSchedule(cfg.hoursSchedule);
  const earliest = now.getTime() + lead * 60_000;
  const nowSp = spClock(now);
  const days: SlotDay[] = [];
  for (let i = 0; i <= daysAhead; i++) {
    const day = new Date(Date.UTC(nowSp.getUTCFullYear(), nowSp.getUTCMonth(), nowSp.getUTCDate() + i));
    const wd = day.getUTCDay();
    const conf = schedule.find((d) => d.weekday === wd);
    const slots: Slot[] = [];
    if (conf?.enabled) {
      const o = toMin(conf.open);
      const c = toMin(conf.close);
      for (let m = o; m + slot <= c; m += slot) {
        const startSp = new Date(day.getTime() + m * 60_000);
        const start = fromSpClock(startSp);
        if (start.getTime() < earliest) continue;
        const endSp = new Date(startSp.getTime() + slot * 60_000);
        slots.push({
          start: start.toISOString(),
          end: fromSpClock(endSp).toISOString(),
          label: `${hm(startSp)} - ${hm(endSp)}`,
        });
      }
    }
    if (slots.length) {
      days.push({
        key: day.toISOString().slice(0, 10),
        weekdayShort: WEEK_SHORT[wd],
        day: day.getUTCDate(),
        isToday: i === 0,
        slots,
      });
    }
  }
  return days;
}

/** Valida no servidor se o horário pertence a algum slot válido. */
export function isValidSlot(cfg: SchedulingConfig, iso: string, now: Date = new Date()): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  // tolerância: antecedência reduzida pela metade para não rejeitar quem demorou no checkout
  const days = buildSlotDays({ ...cfg, leadMinutes: Math.floor((cfg.leadMinutes ?? 30) / 2) }, now);
  return days.some((d) => d.slots.some((s) => new Date(s.start).getTime() === t));
}

/** "Seg. 5 de out. 15h10 - 15h20" */
export function formatScheduledLong(iso: string, slotMinutes = 10): string {
  const s = spClock(new Date(iso));
  const e = new Date(s.getTime() + slotMinutes * 60_000);
  return `${WEEK_LONG[s.getUTCDay()]} ${s.getUTCDate()} de ${MONTHS[s.getUTCMonth()]} ${hm(s)} - ${hm(e)}`;
}

/** "05/10 15h10" */
export function formatScheduledShort(iso: string): string {
  const s = spClock(new Date(iso));
  return `${pad(s.getUTCDate())}/${pad(s.getUTCMonth() + 1)} ${hm(s)}`;
}

/** "05/10/2026 entre 15h10 e 15h20" */
export function formatScheduledFull(iso: string, slotMinutes = 10): string {
  const s = spClock(new Date(iso));
  const e = new Date(s.getTime() + slotMinutes * 60_000);
  return `${pad(s.getUTCDate())}/${pad(s.getUTCMonth() + 1)}/${s.getUTCFullYear()} entre ${hm(s)} e ${hm(e)}`;
}

/** "15h10" no fuso de SP */
export function formatHourSp(iso: string): string {
  return hm(spClock(new Date(iso)));
}
