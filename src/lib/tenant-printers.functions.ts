import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import { requireProPlan } from "@/lib/plan-server";

export type TenantPrinterRole = "receipt" | "kitchen" | "bar" | "counter" | "other";

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
};

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
});

const DeleteInput = z.object({ id: z.string().uuid() });

function parsePaperWidthAndFonts(rawPaperWidth?: string, rawFontSize?: string, rawFontFamily?: string): {
  paperWidth: "55mm" | "80mm";
  fontSize: TenantPrinter["font_size"];
  fontFamily: TenantPrinter["font_family"];
} {
  if (!rawPaperWidth) {
    return {
      paperWidth: "80mm",
      fontSize: (rawFontSize as TenantPrinter["font_size"]) ?? "normal",
      fontFamily: (rawFontFamily as TenantPrinter["font_family"]) ?? "mono",
    };
  }
  if (rawPaperWidth.includes(":")) {
    const [w, size, family] = rawPaperWidth.split(":");
    return {
      paperWidth: w === "55mm" || w === "58mm" ? "55mm" : "80mm",
      fontSize: (size as TenantPrinter["font_size"]) ?? "normal",
      fontFamily: (family as TenantPrinter["font_family"]) ?? "mono",
    };
  }
  return {
    paperWidth: rawPaperWidth === "55mm" || rawPaperWidth === "58mm" ? "55mm" : "80mm",
    fontSize: (rawFontSize as TenantPrinter["font_size"]) ?? "normal",
    fontFamily: (rawFontFamily as TenantPrinter["font_family"]) ?? "mono",
  };
}

function rowToPrinter(row: Record<string, unknown>): TenantPrinter {
  const { paperWidth, fontSize, fontFamily } = parsePaperWidthAndFonts(
    row.paper_width as string | undefined,
    row.font_size as string | undefined,
    row.font_family as string | undefined,
  );
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    name: (row.name as string) ?? "",
    role: (row.role as TenantPrinterRole) ?? "kitchen",
    printer_name: (row.printer_name as string) ?? "",
    paper_width: paperWidth,
    font_size: fontSize,
    font_family: fontFamily,
    is_active: row.is_active !== false,
    is_default: row.is_default === true,
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

    // Codifica font_size e font_family dentro de paper_width (ex: "80mm:normal:mono") para evitar
    // erro de coluna inexistente no schema do Supabase caso a tabela física não tenha essas colunas.
    const dbPaperWidth = `${data.paper_width}:${data.font_size}:${data.font_family}`;
    const payload = {
      tenant_id: resolved.tenantId,
      name: data.name,
      role: data.role,
      printer_name: data.printer_name,
      paper_width: dbPaperWidth,
      is_active: data.is_active,
      is_default: data.is_default,
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
