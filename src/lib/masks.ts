// Máscaras de entrada para inputs comuns (BR).
// Cada função recebe o valor atual e retorna a string formatada.

export function maskDate(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function maskCpfCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    // CPF: 000.000.000-00
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  // CNPJ: 00.000.000/0000-00
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Remove o DDI 55 inicial quando o número brasileiro tem 12 ou 13 dígitos (ex: 5586999998888 -> 86999998888). */
export function stripBrazilDdi(value: string): string {
  const d = value.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    return d.slice(2);
  }
  return d;
}

/** Normaliza número brasileiro para somente dígitos com DDI 55 (ex: (86) 99999-8888 -> 5586999998888). */
export function normalizeBrazilWhatsApp(value: string): string {
  const d = value.replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

export function maskPhone(value: string): string {
  const d = stripBrazilDdi(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const unmask = (value: string) => value.replace(/\D/g, "");

// Máscara de moeda BRL: digita só números e vira centavos (15050 -> "R$ 150,50").
export function maskBRL(value: string): string {
  const d = value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
  if (!d) return "";
  const padded = d.padStart(3, "0");
  const int = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${int},${padded.slice(-2)}`;
}

export function parseBRL(masked: string): number {
  const d = masked.replace(/\D/g, "");
  return d ? Number(d) / 100 : NaN;
}
