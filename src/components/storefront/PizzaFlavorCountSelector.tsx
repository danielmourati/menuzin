import { useId } from "react";
import { cn } from "@/lib/utils";

export function PizzaSliceIcon({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const rawId = useId();
  const maskId = `pizza-slice-mask-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const clamped = Math.min(4, Math.max(1, Math.round(count)));

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
    >
      {clamped > 1 && (
        <defs>
          <mask id={maskId}>
            <rect width="24" height="24" fill="white" />
            {clamped === 2 && (
              <line x1="12" y1="1" x2="12" y2="23" stroke="black" strokeWidth="2.2" />
            )}
            {clamped === 3 && (
              <g stroke="black" strokeWidth="2.2" strokeLinecap="round">
                <line x1="12" y1="12" x2="12" y2="1" />
                <line x1="12" y1="12" x2="21.53" y2="17.5" />
                <line x1="12" y1="12" x2="2.47" y2="17.5" />
              </g>
            )}
            {clamped === 4 && (
              <g stroke="black" strokeWidth="2.2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <line x1="1" y1="12" x2="23" y2="12" />
              </g>
            )}
          </mask>
        </defs>
      )}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        fill="currentColor"
        mask={clamped > 1 ? `url(#${maskId})` : undefined}
      />
    </svg>
  );
}

export function PizzaFlavorCountSelector({
  maxFlavors,
  value,
  onChange,
  selectedCount = 0,
  priceRule,
  showHint = false,
  counts,
  className,
}: {
  maxFlavors: number;
  value: number;
  onChange: (count: number) => void;
  selectedCount?: number;
  priceRule?: "sum_fractions" | "max_value" | "fixed" | null;
  showHint?: boolean;
  counts?: number[];
  className?: string;
}) {
  const limit = Math.min(4, Math.max(1, maxFlavors));
  const options =
    counts && counts.length > 0
      ? counts
      : Array.from({ length: limit }, (_, idx) => idx + 1);

  const ruleText =
    priceRule === "max_value"
      ? "Preço pelo maior valor."
      : "Preço proporcional aos sabores.";

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="text-sm font-bold text-foreground">quantos sabores?</p>
      <div className="flex flex-wrap items-center gap-2.5">
        {options.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(n)}
              className={cn(
                "inline-flex h-11 min-w-[68px] items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition active:scale-[0.98]",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <PizzaSliceIcon count={n} className={active ? "text-primary-foreground" : "text-muted-foreground/60"} />
              <span>{n}</span>
            </button>
          );
        })}
      </div>
      {showHint && (
        <p className="text-xs text-muted-foreground">
          Marque{" "}
          <strong className="text-foreground">
            {value} {value === 1 ? "sabor" : "sabores"}
          </strong>{" "}
          abaixo ({selectedCount} de {value} selecionados) · {ruleText}
        </p>
      )}
    </div>
  );
}

