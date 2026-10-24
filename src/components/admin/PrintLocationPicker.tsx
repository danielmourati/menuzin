import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { listMyTenantPrinters, setPrintLocations } from "@/lib/tenant-printers.functions";

type Props = {
  kind: "product" | "category";
  id?: string;
  value: string[] | null | undefined;
  hint?: string;
};

/** Escolha de locais de impressão (salva na hora para itens já criados). */
export function PrintLocationPicker({ kind, id, value, hint }: Props) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["tenant-printers"], queryFn: () => listMyTenantPrinters(), staleTime: 60_000, retry: false });
  const locations = (data?.printers ?? []).filter((p) => p.role !== "receipt" && p.is_active);
  const [selected, setSelected] = useState<string[]>(value ?? []);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSelected(value ?? []), [value, id]);

  if (locations.length < 2) return null;

  const toggle = async (pid: string, on: boolean) => {
    if (!id || busy) return;
    const next = on ? [...selected, pid] : selected.filter((x) => x !== pid);
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

  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold"><Printer className="h-4 w-4" /> Onde imprimir</div>
      {!id ? (
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
          <p className="text-xs text-muted-foreground">{hint ?? "Sem marcação, imprime no local principal da cozinha."}</p>
        </>
      )}
    </div>
  );
}
