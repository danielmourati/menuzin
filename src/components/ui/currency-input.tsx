import * as React from "react";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | null | undefined;
  onChange: (value: number) => void;
}

function formatBRL(cents: number): string {
  const v = (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `R$ ${v}`;
}

/**
 * Input de moeda em BRL. Mantém `value` como Number em reais
 * (ex.: 1234.56) e mostra mascarado como "R$ 1.234,56".
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, onBlur, onFocus, ...rest }, ref) => {
    const cents = Math.round(Math.max(0, Number(value ?? 0)) * 100);
    const [display, setDisplay] = React.useState<string>(formatBRL(cents));

    React.useEffect(() => {
      setDisplay(formatBRL(cents));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cents]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "");
      const nextCents = digits === "" ? 0 : Number(digits);
      setDisplay(formatBRL(nextCents));
      onChange(nextCents / 100);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onFocus={(e) => {
          e.target.select();
          onFocus?.(e);
        }}
        onBlur={onBlur}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...rest}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";
