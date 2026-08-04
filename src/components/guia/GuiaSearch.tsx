// Busca do Guia: lojas e pratos publicados, com resultado ao vivo.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Store as StoreIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { searchGuia } from "@/lib/directory.functions";
import { productImage } from "@/lib/product-image";
import { brl } from "@/lib/format";

export function GuiaSearchOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ["guia", "search", debounced],
    queryFn: () => searchGuia({ data: { term: debounced } }),
    enabled,
    staleTime: 60_000,
  });

  const stores = data?.stores ?? [];
  const products = data?.products ?? [];
  const empty = enabled && !isFetching && stores.length === 0 && products.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-3 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Buscar no Guia</DialogTitle>
        </DialogHeader>

        <label className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Busque por lojas, pratos ou promoções…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </label>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {!enabled && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Digite ao menos 2 letras para buscar.
            </p>
          )}
          {empty && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nada encontrado para “{debounced}”.
            </p>
          )}

          {stores.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                lojas
              </h3>
              <div className="divide-y overflow-hidden rounded-xl border">
                {stores.map((s) => (
                  <Link
                    key={s.tenant_id}
                    to="/$slug"
                    params={{ slug: s.tenant_slug }}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 p-2.5 transition hover:bg-muted/60"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                      {s.tenant_logo ? (
                        <img src={s.tenant_logo} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <StoreIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.tenant_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.neighborhood ?? "no bairro"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {products.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                pratos
              </h3>
              <div className="divide-y overflow-hidden rounded-xl border">
                {products.map((p) => (
                  <Link
                    key={p.product_id}
                    to="/guia/produto/$id"
                    params={{ id: p.product_id }}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 p-2.5 transition hover:bg-muted/60"
                  >
                    <img
                      src={productImage(p.image_url)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.tenant_name}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-primary">
                      {brl(p.promo_price ?? p.price)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
