// Atendente IA: contexto do cardápio, cálculo seguro do rascunho e criação do pedido.
// A IA nunca define preços — tudo é recalculado aqui a partir do cardápio real.
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DbProduct, DbTenant } from "@/lib/db-types";

export const PAYMENT_LABELS = {
  dinheiro: "Dinheiro em Espécie",
  credito: "Maquininha (Crédito)",
  debito: "Maquininha (Débito)",
  pix_manual: "Pix manual (chave da loja)",
} as const;
export type AgentPayment = keyof typeof PAYMENT_LABELS;

export const DraftItemSchema = z.object({
  product_id: z.string(),
  size_id: z.string().nullable(),
  option_ids: z.array(z.string()),
  qty: z.number(),
  note: z.string().nullable(),
});
export const DraftSchema = z.object({
  items: z.array(DraftItemSchema),
  mode: z.enum(["entrega", "retirada", "consumo_local"]).nullable(),
  customer_name: z.string().nullable(),
  whatsapp: z.string().nullable(),
  address: z
    .object({
      cep: z.string().nullable(),
      street: z.string().nullable(),
      number: z.string().nullable(),
      neighborhood: z.string().nullable(),
      complement: z.string().nullable(),
      reference: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
    })
    .nullable(),
  table_label: z.string().nullable(),
  payment: z.enum(["dinheiro", "credito", "debito", "pix_manual"]).nullable(),
  change_for: z.number().nullable(),
  no_change: z.boolean().nullable(),
  coupon_code: z.string().nullable(),
  note: z.string().nullable(),
});
export type AgentDraft = z.infer<typeof DraftSchema>;

export type PricedLine = {
  product_id: string;
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  details: string[];
  addons: { name: string; price: number }[];
  note: string | null;
};

export type PricedDraft = {
  lines: PricedLine[];
  errors: string[];
  missing: string[];
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  delivery_fee: number;
  delivery_fee_source: string | null;
  delivery_neighborhood: string | null;
  total: number;
  change_back: number | null;
  ready: boolean;
  draft: AgentDraft;
};

export type AgentContext = {
  tenant: DbTenant;
  settings: { enabled: boolean; agent_name: string; tone: string; greeting: string; extra_instructions: string };
  products: DbProduct[];
  inactiveNames: string[];
  coupons: { code: string; discount_type: string; discount_value: number; min_order_total: number; valid_until: string | null }[];
  pizzaCategoryIds: Set<string>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

export async function loadAgentSettings(tenantId: string) {
  const { data } = await supabaseAdmin.from("ai_agent_settings").select("*").eq("tenant_id", tenantId).maybeSingle();
  return {
    enabled: data?.enabled ?? false,
    agent_name: data?.agent_name || "Zinho",
    tone: data?.tone || "descontraido",
    greeting: data?.greeting || "",
    extra_instructions: data?.extra_instructions || "",
  };
}

/** Retorna null se a loja não puder usar o atendente (não Pro, desligado, bloqueada). */
export async function loadAgentContext(slug: string): Promise<AgentContext | null> {
  const { getCatalog } = await import("@/lib/catalog.functions");
  const cat = await getCatalog({ data: { slug } });
  if (!cat.tenant || cat.blocked) return null;
  const tenant = cat.tenant as DbTenant;
  if ((tenant as { plan?: string }).plan !== "pro") return null;
  const settings = await loadAgentSettings(tenant.id);
  if (!settings.enabled) return null;
  const [{ data: inactive }, { listPublicCoupons }] = await Promise.all([
    supabaseAdmin.from("products").select("name").eq("tenant_id", tenant.id).eq("available", false).limit(80),
    import("@/lib/coupons.functions"),
  ]);
  const { coupons } = await listPublicCoupons({ data: { slug } });
  const pizzaCategoryIds = new Set(
    (cat.categories as { id: string; kind: string }[]).filter((c) => c.kind === "pizza").map((c) => c.id),
  );
  return {
    tenant,
    settings,
    products: cat.products as DbProduct[],
    inactiveNames: (inactive ?? []).map((r) => r.name as string),
    coupons,
    pizzaCategoryIds,
  };
}

function isUnsupported(p: DbProduct, ctx: AgentContext) {
  return (p.category_id && ctx.pizzaCategoryIds.has(p.category_id)) || !!p.offer_original_price;
}

/** Cardápio compacto em texto para o modelo. */
export function buildMenuText(ctx: AgentContext): string {
  const byCat = new Map<string, DbProduct[]>();
  for (const p of ctx.products) {
    const k = p.category || "Outros";
    byCat.set(k, [...(byCat.get(k) ?? []), p]);
  }
  const out: string[] = [];
  for (const [cat, list] of byCat) {
    out.push(`## ${cat}`);
    for (const p of list) {
      const unsupported = isUnsupported(p, ctx);
      const base = p.sizes?.length ? "" : ` ${brl(Number(p.promo_price ?? p.price))}`;
      out.push(
        `- [${p.id}] ${p.name}${base}${unsupported ? " (SOMENTE PELO CARDÁPIO)" : ""}${p.description ? ` — ${p.description.slice(0, 140)}` : ""}`,
      );
      for (const s of p.sizes ?? []) out.push(`  - tamanho [${s.id}] ${s.name} ${brl(Number(s.price))}`);
      for (const g of p.addonGroups ?? []) {
        const min = g.required ? Math.max(1, g.min_select | 0) : g.min_select | 0;
        out.push(`  - grupo "${g.name}" (${g.required ? "obrigatório" : "opcional"}, mín ${min}, máx ${Math.max(min || 1, g.max_select | 0)})`);
        for (const o of g.options ?? []) out.push(`    - opção [${o.id}] ${o.name}${Number(o.price) > 0 ? ` +${brl(Number(o.price))}` : ""}`);
      }
      for (const a of p.addons ?? []) out.push(`  - adicional [${a.id}] ${a.name} +${brl(Number(a.price))}`);
    }
  }
  return out.join("\n");
}

export async function priceDraft(ctx: AgentContext, slug: string, draft: AgentDraft): Promise<PricedDraft> {
  const errors: string[] = [];
  const missing: string[] = [];
  const lines: PricedLine[] = [];
  const byId = new Map(ctx.products.map((p) => [p.id, p]));

  for (const it of draft.items) {
    const p = byId.get(it.product_id);
    if (!p) {
      errors.push(`Produto ${it.product_id} não existe ou está indisponível.`);
      continue;
    }
    if (isUnsupported(p, ctx)) {
      errors.push(`"${p.name}" só pode ser pedido pelo cardápio da loja.`);
      continue;
    }
    const qty = Math.max(1, Math.min(99, Math.round(it.qty || 1)));
    const details: string[] = [];
    const addons: { name: string; price: number }[] = [];
    let unit = Number(p.promo_price ?? p.price);
    if (p.sizes?.length) {
      const s = p.sizes.find((x) => x.id === it.size_id);
      if (!s) {
        missing.push(`Tamanho de "${p.name}" (${p.sizes.map((x) => x.name).join(", ")})`);
        continue;
      }
      unit = Number(s.price);
      details.push(`Tamanho: ${s.name}`);
      addons.push({ name: `Tamanho: ${s.name}`, price: 0 });
    }
    const chosen = new Set(it.option_ids);
    let lineOk = true;
    const knownIds = new Set<string>();
    for (const g of p.addonGroups ?? []) {
      const sel = (g.options ?? []).filter((o) => chosen.has(o.id));
      sel.forEach((o) => knownIds.add(o.id));
      const min = g.required ? Math.max(1, g.min_select | 0) : g.min_select | 0;
      const max = Math.max(min || 1, g.max_select | 0);
      if (sel.length < min && (g.required || sel.length > 0)) {
        missing.push(`"${p.name}": escolher ${min} em ${g.name} (opções: ${(g.options ?? []).map((o) => o.name).join(", ")})`);
        lineOk = false;
      } else if (sel.length > max) {
        errors.push(`"${p.name}": máximo ${max} em ${g.name}.`);
        lineOk = false;
      }
      for (const o of sel) {
        unit += Number(o.price);
        details.push(`${g.name}: ${o.name}`);
        addons.push({ name: `${g.name}: ${o.name}`, price: Number(o.price) });
      }
    }
    for (const a of p.addons ?? []) {
      if (!chosen.has(a.id)) continue;
      knownIds.add(a.id);
      unit += Number(a.price);
      details.push(`+ ${a.name}`);
      addons.push({ name: a.name, price: Number(a.price) });
    }
    for (const id of chosen) if (!knownIds.has(id)) errors.push(`Opção ${id} não pertence a "${p.name}".`);
    if (!lineOk) continue;
    unit = round2(unit);
    lines.push({
      product_id: p.id,
      name: p.name,
      qty,
      unit_price: unit,
      line_total: round2(unit * qty),
      details,
      addons,
      note: it.note?.slice(0, 300) || null,
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.line_total, 0));

  // Cupom
  let discount = 0;
  let coupon_code: string | null = null;
  if (draft.coupon_code) {
    const c = ctx.coupons.find((x) => x.code.toUpperCase() === draft.coupon_code!.toUpperCase());
    if (!c) errors.push(`Cupom ${draft.coupon_code} inválido ou expirado.`);
    else if (c.min_order_total > subtotal) errors.push(`Cupom ${c.code} exige pedido mínimo de ${brl(c.min_order_total)}.`);
    else {
      discount = round2(Math.min(subtotal, c.discount_type === "percent" ? (subtotal * c.discount_value) / 100 : c.discount_value));
      coupon_code = c.code;
    }
  }

  // Entrega
  let delivery_fee = 0;
  let delivery_fee_source: string | null = null;
  let delivery_neighborhood: string | null = null;
  if (!draft.mode) missing.push("Entrega, retirada ou consumo no local");
  if (draft.mode === "entrega") {
    const t = ctx.tenant as any;
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const a: any = draft.address ? { ...draft.address } : null;
    let cityError: string | null = null;
    if (a) {
      const cepDigits = String(a.cep ?? "").replace(/\D/g, "");
      if (cepDigits.length === 8) {
        a.cep = cepDigits;
        try {
          const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
          const j: any = res.ok ? await res.json() : null;
          if (j && !j.erro) {
            if (t.city && j.localidade && norm(j.localidade) !== norm(t.city)) {
              cityError = `Esse CEP é de ${j.localidade}/${j.uf}. Só entregamos em ${t.city}${t.state ? `/${t.state}` : ""}.`;
            }
            if (!a.street && j.logradouro) a.street = j.logradouro;
            if (!a.neighborhood && j.bairro) a.neighborhood = j.bairro;
          } else if (j?.erro) {
            cityError = "CEP não encontrado. Confira o número ou informe rua e bairro.";
          }
        } catch { /* segue sem completar */ }
      }
      if (t.city) a.city = t.city;
      if (t.state) a.state = t.state;
      draft.address = a;
    }
    if (cityError) {
      errors.push(cityError);
    } else if (!a?.street || !a?.number || !(a.neighborhood || a.cep)) {
      missing.push(
        a?.street && !a?.number
          ? `Número da casa (rua: ${a.street}${a.neighborhood ? `, ${a.neighborhood}` : ""})`
          : `Endereço em ${t.city ?? "nossa cidade"}: CEP, ou rua, número e bairro`,
      );
    } else {
      const { resolveDeliveryFee } = await import("@/lib/delivery-zones.functions");
      const r = await resolveDeliveryFee({
        data: { tenant_slug: slug, cep: a.cep, neighborhood: a.neighborhood, street: a.street, number: a.number, city: a.city, state: a.state },
      });
      if (!r.available) errors.push(r.message || "Não entregamos nesse endereço.");
      else {
        delivery_fee = Number(r.fee);
        delivery_fee_source = r.source;
        delivery_neighborhood = r.neighborhood;
        if (r.min_order_total > subtotal) errors.push(`Pedido mínimo para esse bairro: ${brl(r.min_order_total)}.`);
      }
    }
  }
  if (draft.mode === "consumo_local" && !draft.table_label) missing.push("Número da mesa");

  const total = round2(Math.max(0, subtotal - discount) + delivery_fee);

  if (!draft.payment) missing.push("Forma de pagamento (dinheiro, maquininha crédito/débito ou Pix manual)");
  let change_back: number | null = null;
  if (draft.payment === "dinheiro") {
    if (!draft.no_change && !(draft.change_for && draft.change_for > 0)) missing.push("Troco para quanto (ou sem troco)");
    if (!draft.no_change && draft.change_for) {
      if (draft.change_for + 0.001 < total) errors.push(`O valor para troco é menor que o total (${brl(total)}).`);
      else {
        const { isPaymentAllowed, bigBillProblem } = await import("@/lib/cash-change");
        const { data: ps } = await supabaseAdmin
          .from("store_payment_settings").select("cash_accepts_100, cash_accepts_200").eq("tenant_id", ctx.tenant.id).maybeSingle();
        const rules = { accepts100: ps?.cash_accepts_100 ?? true, accepts200: ps?.cash_accepts_200 ?? true };
        if (!isPaymentAllowed(total, draft.change_for, rules)) {
          errors.push(`A loja não aceita notas de R$ ${bigBillProblem(total, draft.change_for, rules)} para troco.`);
        } else change_back = round2(draft.change_for - total);
      }
    }
  }
  if (!draft.customer_name) missing.push("Nome do cliente");
  if (!draft.whatsapp || draft.whatsapp.replace(/\D/g, "").length < 10) missing.push("WhatsApp com DDD");
  if (!lines.length) missing.push("Pelo menos um item");

  return {
    lines, errors, missing, subtotal, discount, coupon_code, delivery_fee, delivery_fee_source,
    delivery_neighborhood, total, change_back, ready: !errors.length && !missing.length, draft,
  };
}

export function emptyDraft(): AgentDraft {
  return {
    items: [], mode: null, customer_name: null, whatsapp: null, address: null, table_label: null,
    payment: null, change_for: null, no_change: null, coupon_code: null, note: null,
  };
}

export async function getConversation(id: string, accessKey: string) {
  const { data } = await supabaseAdmin.from("ai_conversations").select("*").eq("id", id).maybeSingle();
  if (!data || data.access_key !== accessKey) return null;
  return data;
}

/** Marca a conversa como aguardando atendente e avisa os aparelhos do lojista. */
export async function notifyHandoff(conversationId: string, tenantId: string) {
  const { data: conv } = await supabaseAdmin.from("ai_conversations")
    .update({ handoff_status: "requested", handoff_requested_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", conversationId).select("customer_name").maybeSingle();
  try {
    const webpush = (await import("web-push")).default;
    const { getVapidPushOptions } = await import("@/lib/push-notifications.server");
    const { data: subs } = await (supabaseAdmin as any).from("push_subscriptions")
      .select("endpoint, p256dh, auth").eq("tenant_id", tenantId).eq("is_admin_device", true);
    const payload = JSON.stringify({
      title: "Cliente pediu atendimento humano",
      body: `${conv?.customer_name || "Um cliente"} quer falar com alguém da loja no chat.`,
      icon: "/icon-192.png", url: "/admin/atendente-ia?tab=conversas", kind: "admin_handoff", tag: `handoff-${conversationId}`,
    });
    const opts = getVapidPushOptions();
    await Promise.all((subs ?? []).map((s: any) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, opts).catch(() => null)));
  } catch (e) {
    console.error("[handoff] push falhou", (e as Error).message);
  }
}
