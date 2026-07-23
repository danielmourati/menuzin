import { BUSINESS_TYPES, BUSINESS_TYPE_LABELS, type BusinessType } from "@/lib/business-types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Props = {
  value: BusinessType[];
  onChange: (v: BusinessType[]) => void;
  max?: number;
};

export function BusinessTypesField({ value, onChange, max }: Props) {
  const toggle = (t: BusinessType) => {
    if (value.includes(t)) {
      onChange(value.filter((x) => x !== t));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, t]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {BUSINESS_TYPES.map((t) => {
        const selected = value.includes(t);
        return (
          <button
            type="button"
            key={t}
            onClick={() => toggle(t)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:border-primary/50",
            )}
          >
            {selected && <Check className="h-3.5 w-3.5" />}
            {BUSINESS_TYPE_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}
