import { supabase } from "@/integrations/supabase/client";
import { getMyTenant } from "@/lib/tenants.functions";

const BUCKET = "tenant-assets";

let cachedTenantId: string | null = null;

async function getCurrentTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;
  const { tenant } = await getMyTenant();
  if (!tenant?.id) {
    throw new Error("Loja não encontrada para o usuário atual. Faça login novamente.");
  }
  cachedTenantId = tenant.id as string;
  return cachedTenantId;
}

/**
 * Faz upload de uma imagem para o bucket `tenant-assets`
 * e retorna a URL pública persistente.
 *
 * O caminho final é sempre prefixado pelo `tenant_id` do usuário
 * autenticado, para que as policies do Storage consigam isolar arquivos
 * entre lojas (cada tenant só pode modificar/apagar arquivos do próprio
 * prefixo).
 *
 * @param file Arquivo (image/*) selecionado pelo usuário
 * @param folder Subpasta lógica dentro do tenant (ex.: "logos", "produtos")
 */
export async function uploadTenantImage(file: File, folder = "uploads"): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo precisa ser uma imagem.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Imagem maior que 5MB. Reduza o arquivo.");
  }

  const tenantId = await getCurrentTenantId();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "_");
  const path = `${tenantId}/${safeFolder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
