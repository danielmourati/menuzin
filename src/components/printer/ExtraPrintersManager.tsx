import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteTenantPrinter,
  listMyTenantPrinters,
  saveTenantPrinter,
  type TenantPrinter,
  type TenantPrinterRole,
} from "@/lib/tenant-printers.functions";
import {
  listQzPrintersWithDefault,
  printQzTextTest,
  QzNotRunningError,
  type QzPrinter,
} from "@/lib/qz-tray";

type DraftPrinter = Partial<TenantPrinter> & {
  _localId: string;
  _dirty?: boolean;
};

const ROLE_LABEL: Record<TenantPrinterRole, string> = {
  receipt: "Recibo (caixa)",
  kitchen: "Cozinha",
  bar: "Bar",
  counter: "Balcão",
  other: "Outro",
};

function makeDraft(): DraftPrinter {
  return {
    _localId: crypto.randomUUID(),
    name: "Cozinha",
    role: "kitchen",
    printer_name: "",
    paper_width: "80mm",
    is_active: true,
    is_default: false,
    _dirty: true,
  };
}

export function ExtraPrintersManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-printers"],
    queryFn: () => listMyTenantPrinters(),
  });

  const [drafts, setDrafts] = useState<DraftPrinter[]>([]);
  const [systemPrinters, setSystemPrinters] = useState<QzPrinter[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (data?.printers) {
      setDrafts(
        data.printers.map((p) => ({ ...p, _localId: p.id, _dirty: false })),
      );
    }
  }, [data]);

  const scanPrinters = async () => {
    setScanLoading(true);
    try {
      const res = await listQzPrintersWithDefault();
      setSystemPrinters(res.printers);
      toast.success(`${res.printers.length} impressora(s) detectada(s)`);
    } catch (err) {
      if (err instanceof QzNotRunningError) {
        toast.error("QZ Tray não está aberto.");
      } else {
        toast.error(err instanceof Error ? err.message : "Falha ao buscar impressoras");
      }
    } finally {
      setScanLoading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (d: DraftPrinter) =>
      saveTenantPrinter({
        data: {
          id: d.id,
          name: d.name ?? "",
          role: (d.role ?? "kitchen") as TenantPrinterRole,
          printer_name: d.printer_name ?? "",
          paper_width: (d.paper_width ?? "80mm") as "55mm" | "80mm",
          is_active: d.is_active ?? true,
          is_default: d.is_default ?? false,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-printers"] });
      toast.success("Impressora salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTenantPrinter({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-printers"] });
      toast.success("Impressora removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDraft = (localId: string, patch: Partial<DraftPrinter>) => {
    setDrafts((prev) =>
      prev.map((d) => (d._localId === localId ? { ...d, ...patch, _dirty: true } : d)),
    );
  };

  const removeDraft = (d: DraftPrinter) => {
    if (d.id) deleteMutation.mutate(d.id);
    else setDrafts((prev) => prev.filter((x) => x._localId !== d._localId));
  };

  const testPrinter = async (d: DraftPrinter) => {
    if (!d.printer_name) {
      toast.error("Selecione uma impressora primeiro");
      return;
    }
    setTesting(d._localId);
    try {
      await printQzTextTest(
        d.printer_name,
        `=== TESTE ===\n${d.name}\n${ROLE_LABEL[(d.role ?? "kitchen") as TenantPrinterRole]}\nImpressao OK`,
      );
      toast.success("Teste enviado");
    } catch (err) {
      if (err instanceof QzNotRunningError) toast.error("QZ Tray não está aberto.");
      else toast.error(err instanceof Error ? err.message : "Falha ao imprimir");
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="font-semibold">Impressoras adicionais</h4>
          <p className="text-xs text-muted-foreground">
            Cozinha, balcão, bar — independentes da impressora de recibo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={scanPrinters} disabled={scanLoading}>
            {scanLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />}
            Detectar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setDrafts((prev) => [...prev, makeDraft()])}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {drafts.length === 0 && !isLoading && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nenhuma impressora adicional. Clique em "Adicionar" para configurar uma impressora de cozinha, por exemplo.
        </p>
      )}

      <div className="space-y-3">
        {drafts.map((d) => (
          <div key={d._localId} className="space-y-3 rounded-lg border bg-card p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={d.name ?? ""}
                  onChange={(e) => updateDraft(d._localId, { name: e.target.value })}
                  placeholder="Ex: Cozinha"
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Função</Label>
                <Select
                  value={d.role ?? "kitchen"}
                  onValueChange={(v) => updateDraft(d._localId, { role: v as TenantPrinterRole })}
                >
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as TenantPrinterRole[]).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Impressora do sistema</Label>
                {systemPrinters.length > 0 ? (
                  <Select
                    value={d.printer_name || undefined}
                    onValueChange={(v) => updateDraft(d._localId, { printer_name: v })}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {systemPrinters.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}{p.isDefault ? " (padrão)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={d.printer_name ?? ""}
                    onChange={(e) => updateDraft(d._localId, { printer_name: e.target.value })}
                    placeholder="Nome exato — ou clique em Detectar"
                    className="mt-1 h-9"
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">Largura</Label>
                <Select
                  value={d.paper_width ?? "80mm"}
                  onValueChange={(v) => updateDraft(d._localId, { paper_width: v as "55mm" | "80mm" })}
                >
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80mm</SelectItem>
                    <SelectItem value="55mm">55mm (58mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={d.is_active ?? true}
                  onCheckedChange={(v) => updateDraft(d._localId, { is_active: v })}
                />
                <span className="text-sm">{d.is_active === false ? "Inativa" : "Ativa"}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => testPrinter(d)}
                  disabled={testing === d._localId}
                >
                  {testing === d._localId
                    ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    : <Printer className="mr-1.5 h-3.5 w-3.5" />}
                  Testar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveMutation.mutate(d)}
                  disabled={!d._dirty || saveMutation.isPending}
                >
                  {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeDraft(d)}
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
