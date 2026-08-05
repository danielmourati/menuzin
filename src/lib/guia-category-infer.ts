// Inferência da categoria do Guia a partir dos dados do cardápio do tenant.

export type GuiaCategorySlug =
  | "quentinha" | "pizza" | "churrasco" | "hamburguer"
  | "lanches" | "marmitex" | "acai" | "doces" | "bebidas";

function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Ordem importa: a primeira regra que casar vence.
const KEYWORD_RULES: { slug: GuiaCategorySlug; words: string[] }[] = [
  { slug: "bebidas", words: ["refri", "suco", "bebida", "agua", "cerveja", "refrigerante", "drink", "cafe", "cha "] },
  { slug: "pizza", words: ["pizza", "calzone"] },
  { slug: "acai", words: ["acai", "sorvete", "milkshake", "milk shake"] },
  { slug: "doces", words: ["sobremesa", "doce", "bolo", "pudim", "brigadeiro", "torta"] },
  { slug: "marmitex", words: ["marmitex", "marmita"] },
  { slug: "quentinha", words: ["quentinha", "prato feito", "pf "] },
  { slug: "hamburguer", words: ["hamburguer", "hamburgueres", "burger", "burguer", "x-", "xis"] },
  { slug: "churrasco", words: ["churrasco", "espeto", "espetinho", "porcao", "porcoes", "grelhado", "frango assado", "costela", "picanha"] },
  { slug: "lanches", words: ["lanche", "combo", "sanduiche", "salgado", "pastel", "hot dog", "cachorro quente", "esfiha", "tapioca"] },
];

const BUSINESS_TYPE_MAP: Record<string, GuiaCategorySlug> = {
  pizzaria: "pizza",
  hamburgueria: "hamburguer",
  churrascaria: "churrasco",
  espetaria: "churrasco",
  marmitaria: "quentinha",
  acaiteria: "acai",
  sorveteria: "acai",
  lanchonete: "lanches",
  pastelaria: "lanches",
  padaria: "lanches",
  cafeteria: "bebidas",
  bar: "bebidas",
  conveniencia: "bebidas",
  food_truck: "lanches",
};

function matchKeywords(text: string | null | undefined): GuiaCategorySlug | null {
  if (!text) return null;
  const t = ` ${norm(text)} `;
  for (const rule of KEYWORD_RULES) {
    if (rule.words.some((w) => t.includes(w))) return rule.slug;
  }
  return null;
}

/** Sugere a categoria do Guia com base na categoria do cardápio, no nome do produto e no tipo de negócio. */
export function inferGuiaCategory(input: {
  menuCategoryName?: string | null;
  productName?: string | null;
  businessTypes?: string[] | null;
}): GuiaCategorySlug | null {
  return (
    matchKeywords(input.menuCategoryName) ??
    matchKeywords(input.productName) ??
    (input.businessTypes ?? []).map((b) => BUSINESS_TYPE_MAP[norm(b)]).find(Boolean) ??
    null
  );
}
