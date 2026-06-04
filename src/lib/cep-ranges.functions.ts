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

export const searchCepRanges = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ results: CepRangeResult[] }> => {
    const raw = (data.q ?? "").trim();
    if (raw.length < 2) return { results: [] };

    const digits = raw.replace(/\D/g, "");
    const isCepish =
      digits.length >= 5 && /^[\d\s-]+$/.test(raw);

    // Optional 2-letter UF token detection (start or end)
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

    const withUf = <T extends { eq: (col: string, v: string) => T }>(q: T): T =>
      uf ? q.eq("uf", uf) : q;

    // Build the parallel queries
    const promises: Array<
      Promise<{ rows: Array<Omit<CepRangeResult, "rank">>; rank: 1 | 2 | 3 | 4 | 5 }>
    > = [];

    if (text.length >= 2) {
      // 1: neighborhood exact (ilike full)
      promises.push(
        withUf(
          supabaseAdmin
            .from("cep_ranges")
            .select(SELECT)
            .not("neighborhood", "is", null)
            .ilike("neighborhood", text)
            .order("city")
            .limit(20),
        ).then(({ data: rows, error }) => {
          if (error) throw new Error(error.message);
          return { rows: (rows ?? []) as Array<Omit<CepRangeResult, "rank">>, rank: 1 as const };
        }),
      );
      // 2: neighborhood partial
      promises.push(
        withUf(
          supabaseAdmin
            .from("cep_ranges")
            .select(SELECT)
            .not("neighborhood", "is", null)
            .ilike("neighborhood", `%${text}%`)
            .order("city")
            .limit(30),
        ).then(({ data: rows, error }) => {
          if (error) throw new Error(error.message);
          return { rows: (rows ?? []) as Array<Omit<CepRangeResult, "rank">>, rank: 2 as const };
        }),
      );
      // 3: city exact
      promises.push(
        withUf(
          supabaseAdmin
            .from("cep_ranges")
            .select(SELECT)
            .ilike("city", text)
            .order("city")
            .limit(20),
        ).then(({ data: rows, error }) => {
          if (error) throw new Error(error.message);
          return { rows: (rows ?? []) as Array<Omit<CepRangeResult, "rank">>, rank: 3 as const };
        }),
      );
      // 4: city partial
      promises.push(
        withUf(
          supabaseAdmin
            .from("cep_ranges")
            .select(SELECT)
            .ilike("city", `%${text}%`)
            .order("city")
            .limit(40),
        ).then(({ data: rows, error }) => {
          if (error) throw new Error(error.message);
          return { rows: (rows ?? []) as Array<Omit<CepRangeResult, "rank">>, rank: 4 as const };
        }),
      );
    } else if (uf && !isCepish) {
      // UF-only query
      promises.push(
        supabaseAdmin
          .from("cep_ranges")
          .select(SELECT)
          .eq("uf", uf)
          .order("city")
          .limit(30)
          .then(({ data: rows, error }) => {
            if (error) throw new Error(error.message);
            return { rows: (rows ?? []) as Array<Omit<CepRangeResult, "rank">>, rank: 3 as const };
          }),
      );
    }

    // 5: CEP range
    if (isCepish) {
      const padded = digits.padEnd(8, "0").slice(0, 8);
      promises.push(
        supabaseAdmin
          .from("cep_ranges")
          .select(SELECT)
          .lte("cep_start", padded)
          .gte("cep_end", padded)
          .order("city")
          .limit(20)
          .then(({ data: rows, error }) => {
            if (error) throw new Error(error.message);
            return { rows: (rows ?? []) as Array<Omit<CepRangeResult, "rank">>, rank: 5 as const };
          }),
      );
    }

    const batches = await Promise.all(promises);

    // Merge by id keeping best (lowest) rank; accent-insensitive narrowing for text
    const byId = new Map<string, CepRangeResult>();
    for (const { rows, rank } of batches) {
      for (const r of rows) {
        if (text && rank <= 4) {
          const hay =
            rank <= 2
              ? norm(r.neighborhood ?? "")
              : norm(r.city);
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
