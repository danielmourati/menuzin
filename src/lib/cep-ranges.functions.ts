import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CepRangeResult = {
  id: string;
  uf: string;
  city: string;
  cep_start: string;
  cep_end: string;
};

const Input = z.object({ q: z.string().max(120).optional().nullable() });

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const searchCepRanges = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ results: CepRangeResult[] }> => {
    const raw = (data.q ?? "").trim();
    if (raw.length < 2) return { results: [] };

    const digits = raw.replace(/\D/g, "");
    // CEP search: 5+ digits, pad to 8 with zeros on the right (so partial CEP matches city ranges)
    if (digits.length >= 5 && /^\d+$/.test(raw.replace(/[\s-]/g, ""))) {
      const padded = digits.padEnd(8, "0").slice(0, 8);
      const { data: rows, error } = await supabaseAdmin
        .from("cep_ranges")
        .select("id, uf, city, cep_start, cep_end")
        .lte("cep_start", padded)
        .gte("cep_end", padded)
        .order("city")
        .limit(20);
      if (error) throw new Error(error.message);
      return { results: rows ?? [] };
    }

    // Text search: optional UF (2 letters) at start/end, rest is city
    const tokens = raw.split(/[\s,/]+/).filter(Boolean);
    let uf: string | null = null;
    let cityTokens = tokens;
    if (tokens.length > 1) {
      const last = tokens[tokens.length - 1];
      const first = tokens[0];
      if (/^[a-zA-Z]{2}$/.test(last)) { uf = last.toUpperCase(); cityTokens = tokens.slice(0, -1); }
      else if (/^[a-zA-Z]{2}$/.test(first) && tokens.length > 1) { uf = first.toUpperCase(); cityTokens = tokens.slice(1); }
    } else if (/^[a-zA-Z]{2}$/.test(raw)) {
      uf = raw.toUpperCase();
      cityTokens = [];
    }

    const cityRaw = cityTokens.join(" ").trim();
    const cityNorm = stripAccents(cityRaw).toLowerCase();

    let query = supabaseAdmin
      .from("cep_ranges")
      .select("id, uf, city, cep_start, cep_end")
      .order("city")
      .limit(200);

    if (uf) query = query.eq("uf", uf);
    if (cityRaw) query = query.ilike("city", `%${cityRaw}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Accent-insensitive narrowing in JS, then cap at 20
    const filtered = (rows ?? []).filter((r) =>
      !cityNorm || stripAccents(r.city).toLowerCase().includes(cityNorm),
    ).slice(0, 20);

    return { results: filtered };
  });
