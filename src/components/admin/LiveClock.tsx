import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function format(now: Date) {
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${mi}` };
}

interface LiveClockProps {
  className?: string;
  compact?: boolean;
}

/**
 * Mostra data e hora atual (pt-BR) atualizando a cada minuto.
 * Discreto, ideal para headers de dashboard e /pedidos.
 */
export function LiveClock({ className = "", compact = false }: LiveClockProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;
  const { date, time } = format(now);

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground ${className}`}
      aria-label={`Agora ${date} ${time}`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      {compact ? (
        <span className="tabular-nums">{time}</span>
      ) : (
        <span className="tabular-nums">
          <span className="hidden sm:inline">{date} · </span>
          {time}
        </span>
      )}
    </div>
  );
}
