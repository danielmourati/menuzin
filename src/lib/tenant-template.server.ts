import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Padronização de tenants — aplica defaults dos tenants de referência
 * (burgerprime / vilaboemia) escolhidos por business_types, sempre em modo
 * "merge não-destrutivo": só preenche campos/registros ausentes, nunca
 * sobrescreve dados já configurados pelo dono da loja.
 */

const TEMPLATE_BURGERPRIME = "burgerprime";
const TEMPLATE_VILABOEMIA = "vilaboemia";

const BURGERPRIME_TYPES = new Set([
  "hamburgueria",
  "lanchonete",
  "pastelaria",
  "food_truck",
  "marmitaria",
  "padaria",
  "cafeteria",
  "conveniencia",
]);

function pickTemplateSlug(businessTypes: string[] | null | undefined): string {
  const types = businessTypes ?? [];
  if (types.some((t) => BURGERPRIME_TYPES.has(t))) return TEMPLATE_BURGERPRIME;
  return TEMPLATE_VILABOEMIA;
}

type Row = Record<string, unknown>;

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "" || (typeof v === "number" && v === 0);
}

export type TemplateReport = {
  template_slug: string;
  updated_fields: string[];
  created: string[];
  skipped: string[];
};

export async function applyTenantTemplate(tenantId: string): Promise<TemplateReport> {
  const { data: target } = await supabaseAdmin
    .from("tenants").select("*").eq("id", tenantId).maybeSingle();
  if (!target) throw new Error("Tenant não encontrado.");

  const templateSlug = pickTemplateSlug((target as Row).business_types as string[] | null);

  // Não aplica o template em si mesmo
  if ((target as Row).slug === templateSlug) {
    return { template_slug: templateSlug, updated_fields: [], created: [], skipped: ["self"] };
  }

  const { data: tpl } = await supabaseAdmin
    .from("tenants").select("*").eq("slug", templateSlug).maybeSingle();
  if (!tpl) {
    return { template_slug: templateSlug, updated_fields: [], created: [], skipped: ["template-not-found"] };
  }

  const report: TemplateReport = { template_slug: templateSlug, updated_fields: [], created: [], skipped: [] };

  // 1) Campos da tabela `tenants` — só preenche o que está vazio
  const fieldsToMerge: string[] = [
    "prep_time",
    "min_order",
    "delivery_fee",
    "pos_paper_width",
    "open_mode",
    "delivery_mode",
    "accepts_delivery",
    "accepts_takeout",
    "accepts_dinein",
    "hours_schedule",
    "theme_from",
    "theme_to",
  ];
  const patch: Row = {};
  for (const f of fieldsToMerge) {
    const cur = (target as Row)[f];
    const ref = (tpl as Row)[f];
    if (isEmpty(cur) && !isEmpty(ref)) {
      patch[f] = ref;
      report.updated_fields.push(f);
    }
  }
  if (Object.keys(patch).length > 0) {
    await supabaseAdmin.from("tenants").update(patch as never).eq("id", tenantId);
  }

  // 2) store_payment_settings — cria se não existir
  const { data: payExists } = await supabaseAdmin
    .from("store_payment_settings").select("id").eq("tenant_id", tenantId).maybeSingle();
  if (!payExists) {
    const { data: refPay } = await supabaseAdmin
      .from("store_payment_settings").select("*").eq("tenant_id", (tpl as Row).id as string).maybeSingle();
    if (refPay) {
      const insert: Row = {
        tenant_id: tenantId,
        provider: (refPay as Row).provider ?? "manual",
        cash_enabled: (refPay as Row).cash_enabled ?? true,
        pix_manual_enabled: (refPay as Row).pix_manual_enabled ?? false,
        card_on_delivery_enabled: (refPay as Row).card_on_delivery_enabled ?? true,
        pix_enabled: (refPay as Row).pix_enabled ?? false,
        credit_card_enabled: (refPay as Row).credit_card_enabled ?? false,
        debit_card_enabled: (refPay as Row).debit_card_enabled ?? false,
      };
      await supabaseAdmin.from("store_payment_settings").insert(insert as never);
      report.created.push("store_payment_settings");
    } else {
      await supabaseAdmin.from("store_payment_settings").insert({
        tenant_id: tenantId,
        provider: "manual",
        cash_enabled: true,
        card_on_delivery_enabled: true,
      } as never);
      report.created.push("store_payment_settings(default)");
    }
  }

  // 3) printer_settings — cria se não existir, copiando flags do template
  const { data: prnExists } = await supabaseAdmin
    .from("printer_settings").select("id").eq("tenant_id", tenantId).maybeSingle();
  if (!prnExists) {
    const { data: refPrn } = await supabaseAdmin
      .from("printer_settings").select("*").eq("tenant_id", (tpl as Row).id as string).maybeSingle();
    const base: Row = refPrn ? { ...(refPrn as Row) } : {};
    delete base.id;
    delete base.tenant_id;
    delete base.created_at;
    delete base.updated_at;
    delete base.printer_name; // específico da máquina do dono
    base.tenant_id = tenantId;
    await supabaseAdmin.from("printer_settings").insert(base as never);
    report.created.push("printer_settings");
  }

  // 4) addon_groups + options + targets — só cria grupos cujo nome falta
  const { data: targetGroups } = await supabaseAdmin
    .from("addon_groups").select("id, name").eq("tenant_id", tenantId);
  const existingNames = new Set(((targetGroups ?? []) as Row[]).map((g) => String(g.name).toLowerCase()));

  const { data: refGroups } = await supabaseAdmin
    .from("addon_groups").select("*").eq("tenant_id", (tpl as Row).id as string);

  // Mapas para remapear targets
  const { data: targetCats } = await supabaseAdmin
    .from("categories").select("id, name").eq("tenant_id", tenantId);
  const { data: targetProds } = await supabaseAdmin
    .from("products").select("id, name").eq("tenant_id", tenantId);
  const targetCatByName = new Map<string, string>();
  for (const c of (targetCats ?? []) as Row[]) targetCatByName.set(String(c.name).toLowerCase(), String(c.id));
  const targetProdByName = new Map<string, string>();
  for (const p of (targetProds ?? []) as Row[]) targetProdByName.set(String(p.name).toLowerCase(), String(p.id));

  const { data: refCats } = await supabaseAdmin
    .from("categories").select("id, name").eq("tenant_id", (tpl as Row).id as string);
  const { data: refProds } = await supabaseAdmin
    .from("products").select("id, name").eq("tenant_id", (tpl as Row).id as string);
  const refCatNameById = new Map<string, string>();
  for (const c of (refCats ?? []) as Row[]) refCatNameById.set(String(c.id), String(c.name).toLowerCase());
  const refProdNameById = new Map<string, string>();
  for (const p of (refProds ?? []) as Row[]) refProdNameById.set(String(p.id), String(p.name).toLowerCase());

  let createdGroups = 0;
  for (const g of (refGroups ?? []) as Row[]) {
    const gName = String(g.name);
    if (existingNames.has(gName.toLowerCase())) continue;

    const { data: newG } = await supabaseAdmin.from("addon_groups").insert({
      tenant_id: tenantId,
      name: gName,
      kind: g.kind ?? "adicional",
      required: g.required ?? false,
      min_select: g.min_select ?? 0,
      max_select: g.max_select ?? 1,
      active: g.active ?? true,
      sort_order: g.sort_order ?? 0,
    } as never).select("id").single();
    if (!newG) continue;
    const newGroupId = (newG as Row).id as string;

    const { data: opts } = await supabaseAdmin
      .from("addon_options").select("*").eq("group_id", g.id as string);
    for (const o of (opts ?? []) as Row[]) {
      await supabaseAdmin.from("addon_options").insert({
        group_id: newGroupId,
        name: o.name,
        price: o.price,
        active: o.active ?? true,
        sort_order: o.sort_order ?? 0,
      } as never);
    }

    const { data: tgts } = await supabaseAdmin
      .from("addon_group_targets").select("*").eq("group_id", g.id as string);
    for (const t of (tgts ?? []) as Row[]) {
      const refCatName = t.category_id ? refCatNameById.get(String(t.category_id)) : undefined;
      const refProdName = t.product_id ? refProdNameById.get(String(t.product_id)) : undefined;
      const newCat = refCatName ? targetCatByName.get(refCatName) ?? null : null;
      const newProd = refProdName ? targetProdByName.get(refProdName) ?? null : null;
      if (!newCat && !newProd) continue;
      await supabaseAdmin.from("addon_group_targets").insert({
        group_id: newGroupId,
        category_id: newCat,
        product_id: newProd,
      } as never);
    }
    createdGroups++;
  }
  if (createdGroups > 0) report.created.push(`addon_groups:${createdGroups}`);

  // 5) categories — completa categorias do template que faltam por nome
  const { data: refCatsFull } = await supabaseAdmin
    .from("categories").select("name, description, sort_order, active, kind")
    .eq("tenant_id", (tpl as Row).id as string)
    .order("sort_order", { ascending: true });
  let createdCats = 0;
  let nextOrder = ((targetCats ?? []) as Row[]).reduce(
    (m, c) => Math.max(m, Number(c.sort_order ?? 0)),
    0,
  ) + 1;
  for (const c of (refCatsFull ?? []) as Row[]) {
    const key = String(c.name).toLowerCase();
    if (targetCatByName.has(key)) continue;
    await supabaseAdmin.from("categories").insert({
      tenant_id: tenantId,
      name: c.name,
      description: c.description ?? "",
      sort_order: nextOrder++,
      active: c.active ?? true,
      kind: c.kind ?? "standard",
    } as never);
    createdCats++;
  }
  if (createdCats > 0) report.created.push(`categories:${createdCats}`);

  return report;
}
