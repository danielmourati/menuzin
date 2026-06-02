import { useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Link as LinkIcon, X } from "lucide-react";
import { toast } from "sonner";
import { uploadTenantImage } from "@/lib/storage";

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  /** Altura do preview (classe Tailwind). Default: "h-32" */
  previewHeight?: string;
}

/**
 * Componente reutilizável para escolher imagem: por upload local OU por URL.
 * Salva a URL pública final no campo controlado.
 */
export function ImageUploader({
  value,
  onChange,
  folder = "uploads",
  label,
  previewHeight = "h-32",
}: ImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadTenantImage(file, folder);
      onChange(url);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error((e as Error).message || "Falha no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      {label && <Label>{label}</Label>}
      {value && (
        <div className={`relative mt-1.5 ${previewHeight} w-full overflow-hidden rounded-xl border bg-muted`}>
          <img src={value} alt="" className="h-full w-full object-contain" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-2 top-2 h-7 w-7 rounded-full"
            onClick={() => onChange(null)}
            aria-label="Remover imagem"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Tabs defaultValue="upload" className="mt-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload"><Upload className="mr-1.5 h-3.5 w-3.5" /> Upload</TabsTrigger>
          <TabsTrigger value="url"><LinkIcon className="mr-1.5 h-3.5 w-3.5" /> URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Escolher do dispositivo</>
            )}
          </Button>
          <p className="mt-1 text-[10px] text-muted-foreground">JPG, PNG ou WebP até 5MB.</p>
        </TabsContent>

        <TabsContent value="url" className="mt-2">
          <Input
            placeholder="https://exemplo.com/imagem.jpg"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
