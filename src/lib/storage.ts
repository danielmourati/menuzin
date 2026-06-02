import { supabase } from "@/integrations/supabase/client";

const BUCKET = "tenant-assets";

/**
 * Faz upload de uma imagem para o bucket público `tenant-assets`
 * e retorna a URL pública persistente.
 *
 * @param file Arquivo (image/*) selecionado pelo usuário
 * @param folder Subpasta lógica (ex.: "logos", "produtos", "<tenantId>/produtos")
 */
export async function uploadTenantImage(file: File, folder = "uploads"): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo precisa ser uma imagem.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Imagem maior que 5MB. Reduza o arquivo.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "_");
  const path = `${safeFolder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
