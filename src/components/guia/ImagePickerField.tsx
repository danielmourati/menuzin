import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { SLOT_IMAGE_SPECS, type GuiaSlotKind } from "@/lib/guia-mock";

type SpecKey = GuiaSlotKind | "category";

type Props = {
  specKey: SpecKey;
  value?: string;
  fit?: "cover" | "contain";
  onChange: (imageUrl: string | undefined, fit: "cover" | "contain") => void;
};

export function ImagePickerField({ specKey, value, fit = "cover", onChange }: Props) {
  const spec = SLOT_IMAGE_SPECS[specKey];
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem (JPG, PNG, WebP ou SVG).");
      return;
    }
    const kb = file.size / 1024;
    if (kb > spec.maxKB) {
      toast.warning(
        `Imagem com ${Math.round(kb)}KB. Recomendado até ${spec.maxKB}KB — considere comprimir.`,
      );
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string, fit);
    reader.onerror = () => toast.error("Falha ao ler o arquivo.");
    reader.readAsDataURL(file);
  };

  const applyUrl = () => {
    const v = urlInput.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v) && !v.startsWith("data:image/")) {
      toast.error("Cole uma URL http(s) válida.");
      return;
    }
    onChange(v, fit);
    setUrlInput("");
  };

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Imagem</Label>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {spec.width}×{spec.height} · {spec.ratio} · até {spec.maxKB}KB
        </Badge>
      </div>

      <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`rounded-md px-3 py-1 font-medium transition ${
            mode === "upload" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`rounded-md px-3 py-1 font-medium transition ${
            mode === "url" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          URL
        </button>
      </div>

      <div className="flex items-start gap-3">
        <div
          className="relative grid shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/40"
          style={{ width: 88, aspectRatio: `${spec.width} / ${spec.height}` }}
        >
          {value ? (
            <img
              src={value}
              alt="Preview"
              className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
            />
          ) : (
            <span className="text-[10px] text-muted-foreground">sem imagem</span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {mode === "upload" ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full justify-center"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" /> Escolher do dispositivo
              </Button>
              <p className="text-[11px] text-muted-foreground">JPG, PNG ou WebP até {spec.maxKB}KB.</p>
            </>
          ) : (
            <>
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyUrl();
                  }
                }}
              />
              <Button type="button" size="sm" variant="secondary" className="w-full" onClick={applyUrl}>
                Usar URL
              </Button>
            </>
          )}

          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full justify-center text-destructive hover:text-destructive"
              onClick={() => onChange(undefined, fit)}
            >
              <X className="mr-1 h-4 w-4" /> Remover imagem
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{spec.hint}</p>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Ajuste:</span>
        <button
          type="button"
          className={`rounded-md border px-2 py-0.5 ${fit === "cover" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          onClick={() => onChange(value, "cover")}
        >
          preencher
        </button>
        <button
          type="button"
          className={`rounded-md border px-2 py-0.5 ${fit === "contain" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          onClick={() => onChange(value, "contain")}
        >
          conter
        </button>
      </div>
    </div>
  );
}

