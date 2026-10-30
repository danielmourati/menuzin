import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { AddonGroup } from "@/lib/domain-types";

type Props = {
  requiredGroups?: AddonGroup[];
  showInvalid?: boolean;
  obsGroups: AddonGroup[];
  addonGroups: AddonGroup[];
  selections: Record<string, string[]>;
  onToggle: (groupId: string, optId: string, maxSelect: number) => void;
  showNote: boolean;
  note: string;
  onNote: (v: string) => void;
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function flatten(groups: AddonGroup[]) {
  return groups.flatMap((g) =>
    g.options
      .filter((o) => o.price >= 0)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((o) => ({ g, o })),
  );
}

function Column({ title, children, footer, badge, invalid }: {
  title: string; children: React.ReactNode; footer?: React.ReactNode; badge?: React.ReactNode; invalid?: boolean;
}) {
  return (
    <div data-invalid={invalid ? "true" : undefined} className={`flex min-h-0 flex-col overflow-hidden rounded-lg border-2 bg-card ${invalid ? "border-destructive" : "border-primary/60"}`}>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <h3 className="min-w-0 flex-1 truncate text-base font-bold">{title}</h3>
        {badge}
      </div>
      <div className="h-64 flex-1 overflow-y-auto">{children}</div>
      {footer}
    </div>
  );
}

function RequiredCard({ g, selections, onToggle, invalid }: { g: AddonGroup; selections: Record<string, string[]>; onToggle: Props["onToggle"]; invalid: boolean }) {
  const items = flatten([g]);
  const isRadio = g.maxSelect === 1;
  const sel = selections[g.id] ?? [];
  return (
    <Column title={g.name} invalid={invalid}
      badge={<span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${invalid ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive"}`}>{g.maxSelect > 1 ? `Até ${g.maxSelect}` : "Obrigatório"}</span>}>
      {items.map(({ o }) => {
        const checked = sel.includes(o.id);
        return (
          <button type="button" key={o.id} onClick={() => onToggle(g.id, o.id, g.maxSelect)} className={`flex w-full text-left cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50 ${checked ? "bg-primary/5 font-medium" : ""}`}>
            {isRadio ? (
              <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${checked ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>{checked && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}</span>
            ) : <Checkbox checked={checked} className="pointer-events-none" />}
            <span className="flex-1">{o.name}</span>
            {o.price > 0 && <span className="text-xs text-muted-foreground">+{fmt(o.price)}</span>}
          </button>
        );
      })}
    </Column>
  );
}

export function PdvCustomizeColumns({ requiredGroups = [], showInvalid = false, obsGroups, addonGroups, selections, onToggle, showNote, note, onNote }: Props) {
  const obs = flatten(obsGroups);
  const adds = flatten(addonGroups);
  const hasObs = obsGroups.length > 0 || showNote;
  const hasAdd = addonGroups.length > 0;
  if (!hasObs && !hasAdd && requiredGroups.length === 0) return null;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {requiredGroups.map((g) => {
        const min = g.required ? Math.max(1, g.minSelect || 0) : Math.max(0, g.minSelect || 0);
        return <RequiredCard key={g.id} g={g} selections={selections} onToggle={onToggle} invalid={showInvalid && (selections[g.id] ?? []).length < min} />;
      })}
      {hasAdd && (
        <Column title="Complementos">
          {adds.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">Nada encontrado.</p>
          ) : adds.map(({ g, o }) => {
            const checked = (selections[g.id] ?? []).includes(o.id);
            return (
              <label key={`${g.id}-${o.id}`} className={`flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50 ${checked ? "bg-primary/5 font-medium" : ""}`}>
                <Checkbox checked={checked} onCheckedChange={() => onToggle(g.id, o.id, g.maxSelect)} />
                <span className="flex-1">{o.name}</span>
                {o.price > 0 && <span className="text-xs text-muted-foreground">+{fmt(o.price)}</span>}
              </label>
            );
          })}
        </Column>
      )}
      {hasObs && (
        <Column
          title="Observações"
          footer={showNote ? (
            <Textarea
              value={note}
              onChange={(e) => onNote(e.target.value)}
              placeholder="Digite aqui outras observações..."
              className="min-h-[56px] resize-none rounded-none border-0 border-t text-sm focus-visible:ring-0"
            />
          ) : undefined}
        >
          {obs.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">{obsGroups.length ? "Nada encontrado." : "Sem observações cadastradas."}</p>
          ) : obs.map(({ g, o }) => {
            const checked = (selections[g.id] ?? []).includes(o.id);
            return (
              <label key={`${g.id}-${o.id}`} className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50">
                <Checkbox checked={checked} onCheckedChange={() => onToggle(g.id, o.id, g.maxSelect)} />
                <span className="flex-1">{o.name}</span>
                {o.price > 0 && <span className="text-xs text-muted-foreground">+{fmt(o.price)}</span>}
              </label>
            );
          })}
        </Column>
      )}
    </div>
  );
}
