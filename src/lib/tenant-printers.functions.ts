import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import { requireProPlan } from "@/lib/plan-server";

export type TenantPrinterRole = "receipt" | "kitchen" | "bar" | "counter" | "other";

/** Sobrescritas de layout do cupom por impressora. `null` = herda da loja. */
export type PrinterLayoutOverrides = {
  font_family?: "mono" | "condensed" | "sans";
  font_size?: "compact" | "normal" | "large";
  separator_char?: string;
  cut_type?: "none" | "partial" | "full";
  feed_lines?: number;
  use_bold_titles?: boolean;
  use_double_total?: boolean;
  show_store_name?: boolean;
  show_address?: boolean;
  show_document?: boolean;
  show_whatsapp?: boolean;
  show_pix?: boolean;
  show_instagram?: boolean;
  show_thank_message?: boolean;
  thank_message?: string;
};

export type TenantPrinter = {
  id: string;
  tenant_id: string;
  name: string;
  role: TenantPrinterRole;
  printer_name: string;
  paper_width: "55mm" | "80mm";
  font_size: "compact" | "normal" | "large";
  font_family: "mono" | "condensed" | "sans";
  is_active: boolean;
  is_default: boolean;
  layout_overrides: PrinterLayoutOverrides | null;
};

const LayoutOverridesSchema = z
  .object({
    font_family: z.enum(["mono", "condensed", "sans"]).optional(),
    font_size: z.enum(["compact", "normal", "large"]).optional(),
    separator_char: z.string().max(1).optional(),
    cut_type: z.enum(["none", "partial", "full"]).optional(),
    feed_lines: z.number().int().min(0).max(10).optional(),
    use_bold_titles: z.boolean().optional(),
    use_double_total: z.boolean().optional(),
    show_store_name: z.boolean().optional(),
    show_address: z.boolean().optional(),
    show_document: z.boolean().optional(),
    show_whatsapp: z.boolean().optional(),
    show_pix: z.boolean().optional(),
    show_instagram: z.boolean().optional(),
    show_thank_message: z.boolean().optional(),
    thank_message: z.string().max(120).optional(),
  })
  .nullable()
  .optional();

const RoleEnum = z.enum(["receipt", "kitchen", "bar", "counter", "other"]);
const PaperEnum = z.enum(["55mm", "80mm"]);
const FontSizeEnum = z.enum(["compact", "normal", "large"]).default("normal");
const FontFamilyEnum = z.enum(["mono", "condensed", "sans"]).default("mono");

const SaveInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(40),
  role: RoleEnum,
  printer_name: z.string().max(80).default(""),
  paper_width: PaperEnum.default("80mm"),
  font_size: FontSizeEnum,
  font_family: FontFamilyEnum,
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  layout_overrides: LayoutOverridesSchema,
});

const DeleteInput = z.object({ id: z.string().uuid() });

function parsePrinterNameAndFonts(rawPrinterName?: string, rawFontFamily?: string): {
  printerName: string;
  fontFamily: TenantPrinter["font_family"];
} {
  if (!rawPrinterName) return { printerName: "", fontFamily: (rawFontFamily as TenantPrinter["font_family"]) ?? "mono" };
  if (rawPrinterName.includes("::ff:")) {
    const [pName, family] = rawPrinterName.split("::ff:");
    return {
      printerName: pName || "",
      fontFamily: (family as TenantPrinter["font_family"]) ?? "mono",
    };
  }
  return {
    printerName: rawPrinterName,
    fontFamily: (rawFontFamily as TenantPrinter["font_family"]) ?? "mono",
  };
}

function rowToPrinter(row: Record<string, unknown>): TenantPrinter {
  const { printerName, fontFamily } = parsePrinterNameAndFonts(
    row.printer_name as string | undefined,
    row.font_family as string | undefined,
  );
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    name: (row.name as string) ?? "",
    role: (row.role as TenantPrinterRole) ?? "kitchen",
    printer_name: printerName,
    paper_width: ((row.paper_width as string) === "55mm" ? "55mm" : "80mm"),
    font_size: (row.font_size as TenantPrinter["font_size"]) ?? "normal",
    font_family: fontFamily,
    is_active: row.is_active !== false,
    is_default: row.is_default === true,
    layout_overrides: (row.layout_overrides as PrinterLayoutOverrides | null) ?? null,
  };
}

export const listMyTenantPrinters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) return { printers: [] as TenantPrinter[] };
    const { data, error } = await supabaseAdmin
      .from("tenant_printers")
      .select("*")
      .eq("tenant_id", resolved.tenantId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { printers: (data ?? []).map((r) => rowToPrinter(r as Record<string, unknown>)) };
  });

export const saveTenantPrinter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Usuário sem loja vinculada.");
    await requireProPlan(resolved.tenantId);

    // Encapsula font_family em printer_name para evitar erro de coluna ou check constraint
    const dbPrinterName = `${data.printer_name}::ff:${data.font_family}`;
    const payload = {
      tenant_id: resolved.tenantId,
      name: data.name,
      role: data.role,
      printer_name: dbPrinterName,
      paper_width: data.paper_width,
      is_active: data.is_active,
      is_default: data.is_default,
      layout_overrides: data.layout_overrides ?? null,
    };

    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("tenant_printers")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", resolved.tenantId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { printer: rowToPrinter(row as Record<string, unknown>) };
    }
    const { data: row, error } = await supabaseAdmin
      .from("tenant_printers")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { printer: rowToPrinter(row as Record<string, unknown>) };
  });

export const deleteTenantPrinter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Usuário sem loja vinculada.");
    const { error } = await supabaseAdmin
      .from("tenant_printers")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", resolved.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
