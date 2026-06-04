import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CepRangeResult = {
  id: string;
  uf: string;
  city: string;
  neighborhood: string | null;
  cep_start: string;
  cep_end: string;
  rank: 1 | 2 | 3 | 4 | 5;
};

const Input = z.object({ q: z.string().max(120).optional().nullable() });

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const norm = (s: string) => stripAccents(s).toLowerCase().trim();

const SELECT = "id, uf, city, neighborhood, cep_start, cep_end";

type RawRow = Omit<CepRangeResult, "rank">;
type Batch = { rows: RawRow[]; rank: 1 | 2 | 3 | 4 | 5 };

export const searchCepRanges = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ results: CepRangeResult[] }> => {
    const raw = (data.q ?? "").trim();
    if (raw.length < 2) return { results: [] };

    const digits = raw.replace(/\D/g, "");
    const isCepish = digits.length >= 5 && /^[\d\s-]+$/.test(raw);

    // Optional 2-letter UF token detection
    const tokens = raw.split(/[\s,/]+/).filter(Boolean);
    let uf: string | null = null;
    let textTokens = tokens;
    if (tokens.length > 1) {
      const last = tokens[tokens.length - 1];
      const first = tokens[0];
      if (/^[a-zA-Z]{2}$/.test(last)) {
        uf = last.toUpperCase();
        textTokens = tokens.slice(0, -1);
      } else if (/^[a-zA-Z]{2}$/.test(first)) {
        uf = first.toUpperCase();
        textTokens = tokens.slice(1);
      }
    } else if (/^[a-zA-Z]{2}$/.test(raw)) {
      uf = raw.toUpperCase();
      textTokens = [];
    }

    const text = textTokens.join(" ").trim();
    const textNorm = norm(text);

    const runText = async (
      col: "neighborhood" | "city",
      pattern: string,
      rank: 1 | 2 | 3 | 4,
      limit: number,
      requireNotNull = false,
    ): Promise<Batch> => {
      let q = supabaseAdmin.from("cep_ranges").select(SELECT);
      if (requireNotNull) q = q.not("neighborhood", "is", null);
      q = q.ilike(col, pattern);
      if (uf) q = q.eq("uf", uf);
      const { data: rows, error } = await q.order("city").limit(limit);
      if (error) throw new Error(error.message);
      return { rows: (rows ?? []) as RawRow[], rank };
    };

    const promises: Promise<Batch>[] = [];

    if (text.length >= 2) {
      promises.push(runText("neighborhood", text, 1, 20, true));
      promises.push(runText("neighborhood", `%${text}%`, 2, 30, true));
      promises.push(runText("city", text, 3, 20));
      promises.push(runText("city", `%${text}%`, 4, 40));
    } else if (uf && !isCepish) {
      promises.push(
        (async (): Promise<Batch> => {
          const { data: rows, error } = await supabaseAdmin
            .from("cep_ranges")
            .select(SELECT)
            .eq("uf", uf!)
            .order("city")
            .limit(30);
          if (error) throw new Error(error.message);
          return { rows: (rows ?? []) as RawRow[], rank: 3 };
        })(),
      );
    }

    if (isCepish) {
      const padded = digits.padEnd(8, "0").slice(0, 8);
      promises.push(
        (async (): Promise<Batch> => {
          const { data: rows, error } = await supabaseAdmin
            .from("cep_ranges")
            .select(SELECT)
            .lte("cep_start", padded)
            .gte("cep_end", padded)
            .order("city")
            .limit(20);
          if (error) throw new Error(error.message);
          return { rows: (rows ?? []) as RawRow[], rank: 5 };
        })(),
      );
    }

    const batches = await Promise.all(promises);

    const byId = new Map<string, CepRangeResult>();
    for (const { rows, rank } of batches) {
      for (const r of rows) {
        if (text && rank <= 4) {
          const hay = rank <= 2 ? norm(r.neighborhood ?? "") : norm(r.city);
          if (!hay.includes(textNorm)) continue;
        }
        const existing = byId.get(r.id);
        if (!existing || rank < existing.rank) {
          byId.set(r.id, { ...r, rank });
        }
      }
    }

    const merged = Array.from(byId.values()).sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.city.localeCompare(b.city);
    });

    return { results: merged.slice(0, 20) };
  });
