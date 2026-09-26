import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reorderCatalogItem } from "@/lib/catalog-admin.functions";

type Entity = "category" | "product" | "addonGroup" | "addonOption";

type Props = {
  entity: Entity;
  id: string;
  /** Chaves da query para invalidar após o swap (lista a ser reordenada). */
  invalidateKeys: ReadonlyArray<ReadonlyArray<unknown>>;
  /** Ids na ordem exibida na tela — a seta troca com o vizinho visível. */
  siblingIds?: string[];
  isFirst?: boolean;
  isLast?: boolean;
};

export function ReorderButtons({ entity, id, invalidateKeys, siblingIds, isFirst, isLast }: Props) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (direction: "up" | "down") =>
      reorderCatalogItem({ data: { entity, id, direction, orderedIds: siblingIds } }),
    onSettled: () =>
      Promise.all(
        invalidateKeys.map((key) =>
          qc.invalidateQueries({ queryKey: key as unknown as readonly unknown[] }),
        ),
      ),
    onError: (e: Error) => toast.error(e.message || "Não foi possível mudar a ordem."),
  });

  return (
    <div className="flex flex-col">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        title="Mover para cima"
        disabled={isFirst || mut.isPending}
        onClick={(e) => { e.stopPropagation(); mut.mutate("up"); }}
      >
        {mut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        title="Mover para baixo"
        disabled={isLast || mut.isPending}
        onClick={(e) => { e.stopPropagation(); mut.mutate("down"); }}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
