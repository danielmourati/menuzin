// Área única de impressoras: lista à esquerda (impressora principal da loja +
// impressoras adicionais) e configuração da selecionada à direita.
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Loader2, Plus, Printer, Trash2, Store } from "lucide-react";
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
    font_size: "normal",
    font_family: "mono",
    is_active: true,
    is_default: false,
    _dirty: true,
  };
}

export interface PrintersManagerProps {
  /** Nome da impressora principal (padrão da loja) exibido na lista. */
  mainPrinterName?: string;
  /** Painel de configuração da impressora principal. */
  mainDetail: ReactNode;
  /** Quando false, as impressoras adicionais ficam bloqueadas pelo plano. */
  canMultiple?: boolean;
  /** Aviso de upgrade exibido no lugar do formulário das adicionais. */
  upgradeNotice?: ReactNode;
}

export function PrintersManager({
  mainPrinterName,
  mainDetail,
  canMultiple = true,
  upgradeNotice,
}: PrintersManagerProps) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-printers"],
    queryFn: () => listMyTenantPrinters(),
    enabled: canMultiple,
  });

  const [drafts, setDrafts] = useState<DraftPrinter[]>([]);
  const [systemPrinters, setSystemPrinters] = useState<QzPrinter[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("main");

  useEffect(() => {
    if (data?.printers) {
      setDrafts((prev) => {
        const localOnly = prev.filter((d) => !d.id);
        return [
          ...data.printers.map((p) => ({ ...p, _localId: p.id, _dirty: false })),
          ...localOnly,
        ];
      });
    }
  }, [data]);

  const selected = useMemo(
    () => drafts.find((d) => d._localId === selectedId) ?? null,
    [drafts, selectedId],
  );

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
          font_size: (d.font_size ?? "normal") as "compact" | "normal" | "large",
          font_family: (d.font_family ?? "mono") as "mono" | "condensed" | "sans",
          is_active: d.is_active ?? true,
          is_default: d.is_default ?? false,
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["tenant-printers"] });
      const saved = (res as { printer?: TenantPrinter } | undefined)?.printer;
      if (saved) {
        setDrafts((prev) =>
          prev.map((d) =>
            d._localId === selectedId ? { ...saved, _localId: saved.id, _dirty: false } : d,
          ),
        );
        setSelectedId(saved.id);
      }
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
    setSelectedId("main");
    if (d.id) deleteMutation.mutate(d.id);
    else setDrafts((prev) => prev.filter((x) => x._localId !== d._localId));
  };

  const addDraft = () => {
    const d = makeDraft();
    setDrafts((prev) => [...prev, d]);
    setSelectedId(d._localId);
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
        { feedLines: 4, cutType: "partial" },
      );
      toast.success("Teste enviado");
    } catch (err) {
      if (err instanceof QzNotRunningError) toast.error("QZ Tray não está aberto.");
      else toast.error(err instanceof Error ? err.message : "Falha ao imprimir");
    } finally {
      setTesting(null);
    }
  };

  const listItemClass = (active: boolean) =>
    "w-full shrink-0 rounded-lg border px-3 py-2.5 text-left transition-colors " +
    (active
      ? "border-primary bg-primary/5 text-foreground"
      : "border-transparent bg-muted/40 hover:bg-muted text-muted-foreground");

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      {/* Lista (esquerda no desktop, faixa rolável no mobile) */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Impressoras
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          <button type="button" className={listItemClass(selectedId === "main")} onClick={() => setSelectedId("main")}>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Store className="h-4 w-4 shrink-0" />
              Caixa (recibo)
            </span>
            <span className="mt-0.5 block truncate text-xs opacity-80">
              {mainPrinterName || "Nenhuma impressora"}
            </span>
          </button>

          {canMultiple &&
            drafts.map((d) => (
              <button
                key={d._localId}
                type="button"
                className={listItemClass(selectedId === d._localId)}
                onClick={() => setSelectedId(d._localId)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Printer className="h-4 w-4 shrink-0" />
                  {d.name || "Sem nome"}
                </span>
                <span className="mt-0.5 block truncate text-xs opacity-80">
                  {d.printer_name || "Nenhuma impressora"}
                  {d.is_active === false ? " · inativa" : ""}
                </span>
              </button>
            ))}
        </div>

        {canMultiple && (
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" className="h-8 flex-1 text-xs" onClick={addDraft}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={scanPrinters}
              disabled={scanLoading}
            >
              {scanLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
        {isLoading && canMultiple && (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        )}
      </div>

      {/* Detalhe */}
      <div className="rounded-lg border bg-card p-4">
        {selectedId === "main" ? (
          mainDetail
        ) : !canMultiple ? (
          upgradeNotice
        ) : selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={selected.name ?? ""}
                  onChange={(e) => updateDraft(selected._localId, { name: e.target.value })}
                  placeholder="Ex: Cozinha"
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Função</Label>
                <Select
                  value={selected.role ?? "kitchen"}
                  onValueChange={(v) => updateDraft(selected._localId, { role: v as TenantPrinterRole })}
                >
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as TenantPrinterRole[]).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Impressora do sistema</Label>
                {systemPrinters.length > 0 ? (
                  <Select
                    value={selected.printer_name || undefined}
                    onValueChange={(v) => updateDraft(selected._localId, { printer_name: v })}
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
                    value={selected.printer_name ?? ""}
                    onChange={(e) => updateDraft(selected._localId, { printer_name: e.target.value })}
                    placeholder="Nome exato — ou clique em Detectar"
                    className="mt-1 h-9"
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">Largura</Label>
                <Select
                  value={selected.paper_width ?? "80mm"}
                  onValueChange={(v) => updateDraft(selected._localId, { paper_width: v as "55mm" | "80mm" })}
                >
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80mm</SelectItem>
                    <SelectItem value="55mm">55mm (58mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Padrão da Fonte</Label>
                <Select
                  value={selected.font_family ?? "mono"}
                  onValueChange={(v) => updateDraft(selected._localId, { font_family: v as "mono" | "condensed" | "sans" })}
                >
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mono">Monoespaçada (Padrão)</SelectItem>
                    <SelectItem value="condensed">Condensada (Compacta)</SelectItem>
                    <SelectItem value="sans">Sans-Serif (Limpa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tamanho da Fonte</Label>
                <Select
                  value={selected.font_size ?? "normal"}
                  onValueChange={(v) => updateDraft(selected._localId, { font_size: v as "compact" | "normal" | "large" })}
                >
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compacta (Pequena)</SelectItem>
                    <SelectItem value="normal">Normal (Média)</SelectItem>
                    <SelectItem value="large">Grande (Legível)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    checked={selected.is_active ?? true}
                    onCheckedChange={(v) => updateDraft(selected._localId, { is_active: v })}
                  />
                  <span className="text-sm">{selected.is_active === false ? "Inativa" : "Ativa"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeDraft(selected)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => testPrinter(selected)}
                  disabled={testing === selected._localId}
                >
                  {testing === selected._localId
                    ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    : <Printer className="mr-1.5 h-3.5 w-3.5" />}
                  Testar impressão
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveMutation.mutate(selected)}
                  disabled={!selected._dirty || saveMutation.isPending}
                >
                  {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Selecione uma impressora na lista.</p>
        )}
      </div>
    </div>
  );
}
