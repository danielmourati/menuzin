import { useMemo, useState } from "react";
import { AlarmClock, CalendarClock, ChevronLeft, ChevronRight, Store as StoreIcon, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { buildSlotDays, formatScheduledLong } from "@/lib/scheduling";

type Props = {
  mode: "entrega" | "retirada" | "consumo_local";
  storeName: string;
  addressLines: string[];
  storeOpen: boolean;
  nowLabel: string | null;
  hoursSchedule: unknown;
  slotMinutes: number;
  daysAhead: number;
  leadMinutes: number;
  value: string | null; // ISO do agendamento, null = agora
  onChange: (v: string | null) => void;
  onChangeMode: () => void;
  onContinue: () => void;
};

export function ScheduleStep(p: Props) {
  const days = useMemo(
    () => buildSlotDays({ hoursSchedule: p.hoursSchedule, slotMinutes: p.slotMinutes, daysAhead: p.daysAhead, leadMinutes: p.leadMinutes }),
    [p.hoursSchedule, p.slotMinutes, p.daysAhead, p.leadMinutes],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [wantSchedule, setWantSchedule] = useState(!p.storeOpen || !!p.value);
  const [dayIdx, setDayIdx] = useState(0);
  const [draft, setDraft] = useState<string | null>(p.value);

  const canNow = p.storeOpen;
  const isScheduled = wantSchedule || !canNow;

  const openPicker = () => {
    setWantSchedule(true);
    setDraft(p.value);
    const idx = p.value ? days.findIndex((d) => d.slots.some((s) => s.start === p.value)) : 0;
    setDayIdx(Math.max(0, idx));
    setPickerOpen(true);
  };

  const continueClick = () => {
    if (isScheduled && !p.value) return openPicker();
    p.onContinue();
  };

  const day = days[dayIdx];

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      <div className="flex gap-3">
        {p.mode === "entrega" ? <MapPin className="mt-0.5 h-6 w-6 shrink-0" /> : <StoreIcon className="mt-0.5 h-6 w-6 shrink-0" />}
        <div className="min-w-0 text-sm text-muted-foreground">
          <p className="font-bold text-foreground">{p.mode === "entrega" ? "Entregar em" : p.storeName}</p>
          {p.addressLines.filter(Boolean).map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          <button type="button" onClick={p.onChangeMode} className="mt-2 inline-flex items-center gap-1.5 text-muted-foreground underline underline-offset-2">
            <Pencil className="h-3.5 w-3.5" /> Alterar entrega ou endereço
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {canNow && (
          <OptionCard
            active={!isScheduled}
            onClick={() => {
              setWantSchedule(false);
              p.onChange(null);
            }}
            icon={<AlarmClock className="h-5 w-5" />}
            title="Agora"
            detail={p.nowLabel ? `(${p.nowLabel})` : ""}
          />
        )}
        {days.length > 0 ? (
          <OptionCard
            active={isScheduled}
            onClick={openPicker}
            icon={<CalendarClock className="h-5 w-5" />}
            title={p.value ? "Agendado" : "Agendar"}
            detail={p.value ? `para ${formatScheduledLong(p.value, p.slotMinutes)}` : "(selecionar horário)"}
          />
        ) : (
          !canNow && <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Não há horários disponíveis para agendamento.</p>
        )}
      </div>

      <div className="mt-auto pt-6">
        <Button className="h-12 w-full text-base font-semibold" onClick={continueClick} disabled={!canNow && days.length === 0}>
          Continuar
        </Button>
      </div>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl p-0">
          <div className="flex max-h-[85vh] flex-col">
            <div className="flex items-center gap-2 px-4 pt-5">
              <AlarmClock className="h-5 w-5" />
              <SheetTitle className="text-lg font-bold">Opções de agendamento</SheetTitle>
            </div>
            <div className="flex items-center gap-1 px-2 py-4">
              <button type="button" aria-label="Dias anteriores" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border disabled:opacity-30" disabled={dayIdx === 0} onClick={() => setDayIdx((i) => Math.max(0, i - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide">
                {days.map((d, i) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDayIdx(i)}
                    className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-sm font-bold leading-tight transition ${i === dayIdx ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                  >
                    <span>
                      {d.isToday ? "Hoje" : d.weekdayShort}
                      <br />
                      <span className="font-normal">{d.day}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" aria-label="Próximos dias" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border disabled:opacity-30" disabled={dayIdx >= days.length - 1} onClick={() => setDayIdx((i) => Math.min(days.length - 1, i + 1))}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4">
              {day?.slots.map((s) => (
                <label key={s.start} className="flex cursor-pointer items-center gap-3 border-b py-3.5 text-base">
                  <input type="radio" name="slot" className="h-5 w-5 accent-[var(--primary)]" checked={draft === s.start} onChange={() => setDraft(s.start)} />
                  {s.label}
                </label>
              ))}
            </div>
            <div className="space-y-2 p-4">
              <Button
                className="h-12 w-full font-semibold"
                disabled={!draft}
                onClick={() => {
                  p.onChange(draft);
                  setPickerOpen(false);
                }}
              >
                Confirmar agendamento
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setPickerOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OptionCard({ active, onClick, icon, title, detail }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; detail: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-muted/60 p-4 text-left transition ${active ? "border-primary" : "border-transparent"}`}
    >
      {icon}
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-bold">{title}</span> <span className="text-muted-foreground">{detail}</span>
      </span>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${active ? "border-foreground bg-foreground" : "border-border"}`}>
        {active && <span className="h-2 w-2 rounded-full bg-background" />}
      </span>
    </button>
  );
}
