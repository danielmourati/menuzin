// ViaCEP client (browser-safe). Public API, CORS-friendly.
// https://viacep.com.br/

export type ViaCepResult = {
  cep: string;            // digits only
  logradouro: string;
  bairro: string;
  localidade: string;     // city
  uf: string;
};

export type ViaCepResponse =
  | { status: "ok"; results: ViaCepResult[] }
  | { status: "empty"; results: [] }
  | { status: "invalid"; results: [] }
  | { status: "error"; results: [] };

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const cepDigits = (v: string) => v.replace(/\D/g, "");

type RawViaCep = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
};

function normalize(raw: RawViaCep): ViaCepResult {
  return {
    cep: cepDigits(raw.cep ?? ""),
    logradouro: (raw.logradouro ?? "").trim(),
    bairro: (raw.bairro ?? "").trim(),
    localidade: (raw.localidade ?? "").trim(),
    uf: (raw.uf ?? "").trim().toUpperCase(),
  };
}

export async function lookupByCep(cep: string): Promise<ViaCepResponse> {
  const d = cepDigits(cep);
  if (d.length !== 8) return { status: "invalid", results: [] };
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) return { status: "error", results: [] };
    const json = (await res.json()) as RawViaCep;
    if (json.erro) return { status: "empty", results: [] };
    return { status: "ok", results: [normalize(json)] };
  } catch {
    return { status: "error", results: [] };
  }
}

export async function searchByAddress(input: {
  uf: string;
  city: string;
  street: string;
}): Promise<ViaCepResponse> {
  const uf = input.uf.trim().toUpperCase();
  const city = stripAccents(input.city.trim());
  const street = stripAccents(input.street.trim());
  if (uf.length !== 2) return { status: "invalid", results: [] };
  if (city.length < 3 || street.length < 3) return { status: "invalid", results: [] };
  try {
    const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`;
    const res = await fetch(url);
    if (!res.ok) return { status: "error", results: [] };
    const json = (await res.json()) as RawViaCep[] | RawViaCep;
    const arr = Array.isArray(json) ? json : [json];
    const results = arr.filter((r) => !r.erro && r.cep).map(normalize);
    return results.length === 0
      ? { status: "empty", results: [] }
      : { status: "ok", results };
  } catch {
    return { status: "error", results: [] };
  }
}

export function rankResults(results: ViaCepResult[], term: string): ViaCepResult[] {
  const t = stripAccents(term).toLowerCase().trim();
  if (!t) return results;
  const score = (r: ViaCepResult) => {
    const bairro = stripAccents(r.bairro).toLowerCase();
    const logr = stripAccents(r.logradouro).toLowerCase();
    if (bairro && bairro === t) return 1;
    if (bairro && bairro.includes(t)) return 2;
    if (logr && logr === t) return 3;
    if (logr && logr.includes(t)) return 4;
    return 5;
  };
  return [...results].sort((a, b) => score(a) - score(b));
}
