import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import { DEFAULT_PRINTER_SETTINGS, type PrinterSettings } from "@/lib/printer-types";

const PaperWidth = z.enum(["55mm", "80mm"]);
const ConnectionType = z.enum(["bluetooth", "usb", "network", "browser"]);
const EscPosProfile = z.enum(["generic", "mini_bt_58", "generic_80", "elgin_i8_i9"]);
const FontSize = z.enum(["compact", "normal", "large"]);
const FontFamily = z.enum(["mono", "condensed", "sans"]);
const CutType = z.enum(["none", "partial", "full"]);

const SaveInput = z.object({
  printer_name: z.string().max(80).default(""),
  printer_model: z.string().min(1).max(80),
  paper_width: PaperWidth,
  connection_type: ConnectionType,
  escpos_profile: EscPosProfile,
  font_size: FontSize.default("normal"),
  font_family: FontFamily.default("mono"),
  use_bold_titles: z.boolean(),
  use_double_total: z.boolean(),
  show_store_name: z.boolean(),
  show_address: z.boolean(),
  show_document: z.boolean(),
  show_whatsapp: z.boolean(),
  show_pix: z.boolean(),
  show_instagram: z.boolean(),
  show_thank_message: z.boolean(),
  thank_message: z.string().max(120),
  separator_char: z.string().min(1).max(3),
  cut_type: CutType,
  feed_lines: z.number().int().min(0).max(10),
  auto_connect: z.boolean().default(false),
  auto_accept_orders: z.boolean().default(false),
});

function parseModelAndFontFamily(rawModel?: string, rawFontFamily?: string): {
  printerModel: string;
  fontFamily: PrinterSettings["font_family"];
} {
  if (!rawModel) return { printerModel: DEFAULT_PRINTER_SETTINGS.printer_model, fontFamily: (rawFontFamily as PrinterSettings["font_family"]) ?? "mono" };
  if (rawModel.includes("::ff:")) {
    const [model, family] = rawModel.split("::ff:");
    return {
      printerModel: model || DEFAULT_PRINTER_SETTINGS.printer_model,
      fontFamily: (family as PrinterSettings["font_family"]) ?? "mono",
    };
  }
  return {
    printerModel: rawModel,
    fontFamily: (rawFontFamily as PrinterSettings["font_family"]) ?? "mono",
  };
}

function rowToSettings(row: Record<string, unknown> | null): PrinterSettings {
  if (!row) return { ...DEFAULT_PRINTER_SETTINGS };
  const { printerModel, fontFamily } = parseModelAndFontFamily(
    row.printer_model as string | undefined,
    row.font_family as string | undefined,
  );
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    printer_name: (row.printer_name as string) ?? "",
    printer_model: printerModel,
    paper_width: ((row.paper_width as string) === "58mm" ? "55mm" : (row.paper_width as PrinterSettings["paper_width"])) ?? "80mm",
    connection_type: (row.connection_type as PrinterSettings["connection_type"]) ?? "browser",
    escpos_profile: (row.escpos_profile as PrinterSettings["escpos_profile"]) ?? "generic",
    font_size: (row.font_size as PrinterSettings["font_size"]) ?? "normal",
    font_family: fontFamily,
    use_bold_titles: row.use_bold_titles !== false,
    use_double_total: row.use_double_total !== false,
    show_store_name: row.show_store_name !== false,
    show_address: row.show_address !== false,
    show_document: row.show_document !== false,
    show_whatsapp: row.show_whatsapp !== false,
    show_pix: row.show_pix !== false,
    show_instagram: row.show_instagram !== false,
    show_thank_message: row.show_thank_message !== false,
    thank_message: (row.thank_message as string) ?? DEFAULT_PRINTER_SETTINGS.thank_message,
    separator_char: (row.separator_char as string) ?? "-",
    cut_type: (row.cut_type as PrinterSettings["cut_type"]) ?? "none",
    feed_lines: typeof row.feed_lines === "number" ? row.feed_lines : 3,
    auto_connect: row.auto_connect === true,
    auto_accept_orders: row.auto_accept_orders === true,
  };
}


export const getMyPrinterSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) return { settings: { ...DEFAULT_PRINTER_SETTINGS } };
    const { data } = await supabaseAdmin
      .from("printer_settings")
      .select("*")
      .eq("tenant_id", resolved.tenantId)
      .maybeSingle();
    return { settings: rowToSettings(data as Record<string, unknown> | null) };
  });

export const saveMyPrinterSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Usuário sem loja vinculada.");

    // Armazena font_family dentro de printer_model usando a tag "::ff:" (ex: "Generic thermal printer::ff:condensed").
    // Isso evita o erro de coluna inexistente ("font_family not found") E respeita o check constraint de font_size.
    const { font_family, printer_model, ...dbData } = data;
    const dbPrinterModel = `${printer_model}::ff:${font_family}`;

    const { data: row, error } = await supabaseAdmin
      .from("printer_settings")
      .upsert(
        { tenant_id: resolved.tenantId, ...dbData, printer_model: dbPrinterModel },
        { onConflict: "tenant_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { settings: rowToSettings(row as Record<string, unknown>) };
  });
