import { confirmDialog } from "@/hooks/useConfirm";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react";
import {
  useGuiaSlots,
  guiaActions,
  SLOT_KIND_LABELS,
  type GuiaSlot,
  type GuiaSlotKind,
} from "@/lib/guia-mock";
import { SlotCard } from "@/components/guia/SlotCard";
import { SlotFormDialog } from "@/components/guia/SlotFormDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/platform/guia/slots")({
  component: PlatformGuiaSlots,
});

function PlatformGuiaSlots() {
  const [kind, setKind] = useState<GuiaSlotKind>("hero");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GuiaSlot | null>(null);
  const slots = useGuiaSlots(kind);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Destaques, banners & carrosséis</h2>
              <p className="text-sm text-muted-foreground">
                Cada tipo alimenta um bloco diferente da home do Guia.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={kind} onValueChange={(v) => setKind(v as GuiaSlotKind)}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SLOT_KIND_LABELS) as GuiaSlotKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{SLOT_KIND_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="mr-1 h-4 w-4" /> Novo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {slots.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          Nenhum item deste tipo. Clique em "Novo" para criar.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {slots.map((s, i) => (
            <Card key={s.id} className={s.active ? "" : "opacity-60"}>
              <CardContent className="p-4">
                <div className="mb-3 rounded-2xl bg-muted/40 p-3">
                  <SlotCard slot={s} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-bold">{s.title}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">{SLOT_KIND_LABELS[s.kind]}</Badge>
                      {!s.active && <Badge variant="secondary">Oculto</Badge>}
                      {s.endsAt && <Badge variant="secondary">com expiração</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={s.active}
                      onCheckedChange={(v) => guiaActions.updateSlot(s.id, { active: v })}
                    />
                    <Button size="icon" variant="ghost" onClick={() => guiaActions.moveSlot(s.id, -1)} disabled={i === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => guiaActions.moveSlot(s.id, 1)} disabled={i === slots.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { guiaActions.duplicateSlot(s.id); toast.success("Duplicado."); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={async () => {
                      if (await confirmDialog({ title: `Remover "${s.title}"?`, variant: "destructive", confirmText: "Remover" })) {
                        guiaActions.deleteSlot(s.id);
                        toast.success("Removido.");
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SlotFormDialog open={open} onOpenChange={setOpen} slot={editing} defaultKind={kind} />
    </div>
  );
}
