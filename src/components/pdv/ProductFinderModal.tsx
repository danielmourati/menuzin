import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, List, LayoutGrid, RefreshCw, Plus, MoreHorizontal, Loader2 } from "lucide-react";
import { brl } from "@/lib/format";
import { categoryColor } from "@/lib/pdv-customization";
import { cn } from "@/lib/utils";

export type FinderRow = {
  key: string;
  productId: string;
  categoryId: string | null;
  categoryName: string;
  code: string;
  name: string;
  price: number;
  sizeId?: string;
  needsChoice: boolean;
};

export function ProductFinderModal({
  open, onOpenChange, rows, categories, loading, onRefresh, onAddDirect, onPersonalize,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: FinderRow[];
  categories: { id: string; name: string }[];
  loading?: boolean;
  onRefresh: () => void;
  onAddDirect: (r: FinderRow) => void;
  onPersonalize: (r: FinderRow) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [view, setView] = useState<"table" | "grid">("table");
  const [group, setGroup] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = cat === "all" ? rows : rows.filter((r) => r.categoryId === cat);
    if (s) list = list.filter((r) => r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s));
    if (group) list = [...list].sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    return list;
  }, [rows, q, cat, group]);

  useEffect(() => { setSel(0); }, [q, cat, group]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const add = (r: FinderRow | undefined) => {
    if (!r) return;
    if (r.needsChoice) onPersonalize(r);
    else onAddDirect(r);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "F11") { e.preventDefault(); add(filtered[sel]); }
      else if (e.key === "Enter") { e.preventDefault(); const r = filtered[sel]; if (r) onPersonalize(r); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => Math.min(i + 1, filtered.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => Math.max(i - 1, 0)); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, sel]);

  useEffect(() => {
    tableRef.current?.querySelector(`[data-row="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const AddBtn = ({ r }: { r: FinderRow }) =>
    r.needsChoice ? (
      <button onClick={(e) => { e.stopPropagation(); onPersonalize(r); }} className="rounded-full bg-warning/20 px-2.5 py-1 text-[11px] font-bold text-warning-foreground" title="Este item precisa de escolhas">
        Escolher
      </button>
    ) : (
      <button onClick={(e) => { e.stopPropagation(); onAddDirect(r); }} className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90" title="Adicionar (F11)" aria-label="Adicionar">
        <Plus className="h-5 w-5" />
      </button>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:h-[90vh] sm:w-[95vw] sm:max-w-6xl sm:rounded-xl">
        <div className="border-b px-5 py-3"><DialogTitle>Localizar Produto</DialogTitle></div>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por nome ou código..." className="h-11 pl-9 text-base focus-visible:ring-primary" />
          </div>
          <div className="ml-auto hidden items-center rounded-lg border p-1 sm:flex">
            <button onClick={() => setView("table")} className={cn("rounded p-1.5", view === "table" && "bg-muted")} aria-label="Lista"><List className="h-4 w-4" /></button>
            <button onClick={() => setView("grid")} className={cn("rounded p-1.5", view === "grid" && "bg-muted")} aria-label="Grade"><LayoutGrid className="h-4 w-4" /></button>
          </div>
          <Button variant="outline" onClick={onRefresh} className="gap-1.5"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /><span className="hidden sm:inline">Atualizar</span></Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b p-2 md:w-52 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            <button onClick={() => setCat("all")} className={cn("shrink-0 rounded-md px-3 py-2.5 text-left text-sm font-bold uppercase bg-foreground text-background", cat === "all" ? "ring-2 ring-primary ring-offset-2" : "opacity-80")}>Todas</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-md px-3 py-2.5 text-left text-sm font-bold uppercase", categoryColor(c.id), cat === c.id ? "ring-2 ring-primary ring-offset-2" : "opacity-85 hover:opacity-100")}>
                {c.name}
              </button>
            ))}
          </div>

          <div ref={tableRef} className="min-h-0 flex-1 overflow-auto">
            {loading && rows.length === 0 ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : view === "table" ? (
              <table className="hidden w-full text-sm sm:table">
                <thead className="sticky top-0 z-10 bg-muted text-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Categoria</th>
                    <th className="px-3 py-2.5 text-left">Cód.</th>
                    <th className="px-3 py-2.5 text-left">Nome do Produto</th>
                    <th className="px-3 py-2.5 text-right">Preço</th>
                    <th className="w-28 px-3 py-2.5 text-center">Adicionar (F11)</th>
                    <th className="w-32 px-3 py-2.5 text-center">Personalizar (Enter)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.key} data-row={i} onClick={() => setSel(i)} onDoubleClick={() => onPersonalize(r)}
                      className={cn("cursor-pointer border-b", i === sel ? "bg-primary text-primary-foreground" : "hover:bg-muted/50")}>
                      <td className="px-3 py-3 uppercase">{r.categoryName}</td>
                      <td className="px-3 py-3 font-mono text-xs opacity-80">{r.code}</td>
                      <td className="px-3 py-3 font-semibold uppercase">{r.name}</td>
                      <td className="px-3 py-3 text-right font-bold whitespace-nowrap">{brl(r.price)}</td>
                      <td className="px-3 py-2 text-center"><AddBtn r={r} /></td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={(e) => { e.stopPropagation(); onPersonalize(r); }} className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground ring-1 ring-border" aria-label="Personalizar">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <div className={cn("grid grid-cols-2 gap-3 p-3 md:grid-cols-3 lg:grid-cols-4", view === "table" && "sm:hidden")}>
              {filtered.map((r) => (
                <div key={r.key} onClick={() => add(r)} className="flex cursor-pointer flex-col rounded-lg border bg-card p-3 active:scale-[0.98] hover:border-primary">
                  <span className="text-[10px] uppercase text-muted-foreground">{r.categoryName}</span>
                  <span className="flex-1 text-sm font-semibold leading-tight">{r.name}</span>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-primary">{brl(r.price)}</span>
                    {r.needsChoice ? <span className="text-[10px] font-bold text-warning-foreground">Escolher</span> : <Plus className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              ))}
            </div>
            {!loading && filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm">
          <label className="flex items-center gap-2"><Switch checked={group} onCheckedChange={setGroup} /> Agrupar categoria</label>
          <span className="font-medium">{filtered.length} produtos encontrados.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
