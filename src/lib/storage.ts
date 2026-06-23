import { supabase } from "@/integrations/supabase/client";
import { getMyTenant } from "@/lib/tenants.functions";

const BUCKET = "tenant-assets";
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

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
 * Converte um arquivo de imagem em um Blob WebP, redimensionando para no
 * máximo MAX_DIMENSION no maior lado. Retorna null se não foi possível
 * converter (formato não suportado, decode falhou, browser sem suporte
 * a canvas.toBlob('image/webp'), etc.) — o caller deve usar o arquivo
 * original como fallback nesse caso.
 */
async function convertToWebp(file: File): Promise<Blob | null> {
  // Skip vetorial e GIF (animado): subir como está
  if (file.type === "image/svg+xml" || file.type === "image/gif") return null;
  if (typeof document === "undefined") return null;

  try {
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      bitmap = null;
    }

    let width: number;
    let height: number;
    let drawSource: CanvasImageSource;

    if (bitmap) {
      width = bitmap.width;
      height = bitmap.height;
      drawSource = bitmap;
    } else {
      // Fallback via <img>
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("decode falhou"));
          el.src = url;
        });
        width = img.naturalWidth;
        height = img.naturalHeight;
        drawSource = img;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    if (!width || !height) return null;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const outW = Math.round(width * scale);
    const outH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap?.close?.();
      return null;
    }
    ctx.drawImage(drawSource, 0, 0, outW, outH);
    bitmap?.close?.();

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", WEBP_QUALITY);
    });

    if (!blob || blob.size === 0) return null;
    // Se ficou maior que o original (raro, em imagens já bem comprimidas),
    // mantém o original
    if (blob.size >= file.size && file.type !== "image/png") return null;
    return blob;
  } catch {
    return null;
  }
}

/**
 * Faz upload de uma imagem para o bucket `tenant-assets`
 * e retorna a URL pública persistente.
 *
 * Converte automaticamente para WebP no client antes do upload
 * (com redimensionamento para 1600px no maior lado).
 */
export async function uploadTenantImage(file: File, folder = "uploads"): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo precisa ser uma imagem.");
  }
  // Limite generoso antes da conversão (foto de celular bruta)
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Imagem maior que 15MB. Reduza o arquivo.");
  }

  const converted = await convertToWebp(file);
  const finalBlob: Blob = converted ?? file;
  const finalType = converted ? "image/webp" : file.type;
  const ext = converted ? "webp" : (file.name.split(".").pop()?.toLowerCase() || "jpg");

  if (finalBlob.size > 5 * 1024 * 1024) {
    throw new Error("Imagem final maior que 5MB mesmo após otimização. Reduza o arquivo.");
  }

  const tenantId = await getCurrentTenantId();
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "_");
  const path = `${tenantId}/${safeFolder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, finalBlob, {
    cacheControl: "31536000",
    upsert: false,
    contentType: finalType,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
