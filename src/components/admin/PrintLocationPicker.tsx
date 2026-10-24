import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { listMyTenantPrinters, setPrintLocations, getMyPrintRouting } from "@/lib/tenant-printers.functions";

type Props = {
  kind: "product" | "category";
  id?: string;
  value?: string[] | null;
  hint?: string;
  /** Categoria do produto, para mostrar o local herdado. */
  categoryId?: string | null;
  categoryName?: string;
  /** Sem id (item novo): escolha guardada pelo pai e salva depois. */
  draft?: string[];
  onDraftChange?: (ids: string[]) => void;
};

/** Escolha de locais de impressão (salva na hora para itens já criados). */
export function PrintLocationPicker({ kind, id, value, hint, categoryId, categoryName, draft, onDraftChange }: Props) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["tenant-printers"], queryFn: () => listMyTenantPrinters(), staleTime: 60_000, retry: false });
  const locations = (data?.printers ?? []).filter((p) => p.role !== "receipt" && p.is_active);
  const { data: routing } = useQuery({ queryKey: ["print-routing"], queryFn: () => getMyPrintRouting(), staleTime: 30_000, retry: false, enabled: value === undefined });
  const isDraft = !id && !!onDraftChange;
  const stored = isDraft
    ? draft ?? []
    : value !== undefined
      ? value ?? []
      : id ? (kind === "product" ? routing?.products[id]?.print_location_ids : routing?.categories[id]) ?? [] : [];
  const storedKey = stored.join(",");
  const [selected, setSelected] = useState<string[]>(stored);
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setSelected(stored), [storedKey, id]);

  if (locations.length < 2) return null;

  const nameOf = (pid: string) => {
    const l = locations.find((x) => x.id === pid);
    return l ? l.name || l.printer_name : null;
  };
  const inherited = kind === "product" && categoryId ? (routing?.categories[categoryId] ?? []).map(nameOf).filter(Boolean) : [];

  const apply = async (next: string[]) => {
    if (isDraft) {
      setSelected(next);
      onDraftChange!(next);
      return;
    }
    if (!id || busy) return;
    const prev = selected;
    setSelected(next);
    setBusy(true);
    try {
      await setPrintLocations({ data: { kind, id, location_ids: next } });
      qc.invalidateQueries({ queryKey: ["print-routing"] });
      qc.invalidateQueries({ queryKey: kind === "product" ? ["my-products"] : ["my-categories"] });
    } catch (e) {
      setSelected(prev);
      toast.error(e instanceof Error ? e.message : "Falha ao salvar local de impressão");
    } finally {
      setBusy(false);
    }
  };
  const toggle = (pid: string, on: boolean) => apply(on ? [...selected, pid] : selected.filter((x) => x !== pid));

  let info = hint ?? "Sem marcação, imprime no local principal da cozinha.";
  if (kind === "product") {
    if (selected.length) info = "Este produto imprime só aqui, mesmo que a categoria use outro local.";
    else if (inherited.length) info = `Sem marcação: segue a categoria${categoryName ? ` ${categoryName}` : ""} (${inherited.join(", ")}).`;
    else info = "Sem marcação: imprime no local principal da cozinha.";
  }

  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold"><Printer className="h-4 w-4" /> Onde imprimir</div>
      {!id && !isDraft ? (
        <p className="text-xs text-muted-foreground">Salve primeiro para escolher o local de impressão.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {locations.map((l) => (
              <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selected.includes(l.id)} disabled={busy} onCheckedChange={(v) => toggle(l.id, v === true)} />
                {l.name || l.printer_name}
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{info}</p>
            {kind === "product" && selected.length > 0 && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={busy} onClick={() => apply([])}>
                Usar o da categoria
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
