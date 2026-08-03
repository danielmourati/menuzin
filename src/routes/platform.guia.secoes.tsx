import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowUp, ArrowDown, GripVertical, RotateCcw } from "lucide-react";
import {
  adminListSections,
  adminSetSectionOrder,
  adminSetSectionActive,
  adminResetSections,
} from "@/lib/guia-admin.functions";
import { SECTION_LABELS, type GuiaSectionId } from "@/lib/guia-types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

export const Route = createFileRoute("/platform/guia/secoes")({
  component: PlatformGuiaSecoes,
});

const KEY = ["guia-admin", "sections"];

function PlatformGuiaSecoes() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: KEY, queryFn: () => adminListSections() });
  const order = rows.map((r) => r.id);
  const activeMap: Record<string, boolean> = Object.fromEntries(rows.map((r) => [r.id, r.active]));
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const setOrder = useMutation({
    mutationFn: (o: string[]) => adminSetSectionOrder({ data: { order: o } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const setActive = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => adminSetSectionActive({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: () => adminResetSections(),
    onSuccess: () => {
      invalidate();
      toast.success("Ordem padrão restaurada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as GuiaSectionId);
    const newIndex = order.indexOf(over.id as GuiaSectionId);
    if (oldIndex < 0 || newIndex < 0) return;
    setOrder.mutate(arrayMove(order, oldIndex, newIndex));
  };

  const move = (id: GuiaSectionId, dir: number) => {
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    setOrder.mutate(arrayMove(order, i, j));
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Ordem das seções do Guia</h2>
              <p className="text-sm text-muted-foreground">
                Arraste para reorganizar as seções da home pública do Guia. O Hero fica sempre no topo.
              </p>
            </div>
            <Button variant="outline" onClick={() => reset.mutate()}>
              <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed opacity-80">
        <CardContent className="p-4">
          <p className="text-sm">
            <span className="font-bold">Hero (topo)</span>{" "}
            <span className="text-muted-foreground">— posição fixa, não reordenável.</span>
          </p>
        </CardContent>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((id, i) => (
              <SortableItem
                key={id}
                id={id}
                index={i}
                total={order.length}
                isActive={activeMap[id] !== false}
                onMove={move}
                onToggle={(v) => setActive.mutate({ id, active: v })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            Dica: use o interruptor à direita de cada seção para ativar ou desativar sua exibição na home
            pública do Guia. Seções desativadas não aparecem para os visitantes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SortableItem({
  id,
  index,
  total,
  isActive,
  onMove,
  onToggle,
}: {
  id: GuiaSectionId;
  index: number;
  total: number;
  isActive: boolean;
  onMove: (id: GuiaSectionId, dir: number) => void;
  onToggle: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const meta = SECTION_LABELS[id];
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`${isDragging ? "ring-2 ring-primary" : ""} ${!isActive ? "opacity-60" : ""}`}>
        <CardContent className="flex items-center gap-3 p-3">
          <button
            type="button"
            className="cursor-grab touch-none rounded-md p-2 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label="Arrastar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{meta?.title ?? id}</p>
            <p className="truncate text-xs text-muted-foreground">{meta?.desc}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => onMove(id, -1)} disabled={index === 0} aria-label="Mover para cima">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onMove(id, 1)} disabled={index === total - 1} aria-label="Mover para baixo">
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Switch
              checked={isActive}
              onCheckedChange={onToggle}
              aria-label={isActive ? "Desativar seção" : "Ativar seção"}
              className="ml-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
