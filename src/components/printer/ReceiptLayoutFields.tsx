// Campos de layout do cupom reutilizados na aba "Layout do Cupom" (padrão da
// loja) e no painel de cada impressora adicional (personalização por impressora).
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ReceiptLayoutValues = {
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

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

export interface ReceiptLayoutFieldsProps {
  value: ReceiptLayoutValues;
  onChange: (patch: ReceiptLayoutValues) => void;
  /** Desabilita fonte/tamanho (quando a tipografia padrão do sistema está ativa). */
  typographyDisabled?: boolean;
}

export function ReceiptLayoutFields({
  value,
  onChange,
  typographyDisabled = false,
}: ReceiptLayoutFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className={typographyDisabled ? "opacity-60" : ""}>Padrão da fonte</Label>
          <Select
            disabled={typographyDisabled}
            value={typographyDisabled ? "mono" : (value.font_family ?? "mono")}
            onValueChange={(v) => onChange({ font_family: v as ReceiptLayoutValues["font_family"] })}
          >
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mono">Monoespaçada (Padrão Thermal)</SelectItem>
              <SelectItem value="condensed">Condensada (Compacta Font B)</SelectItem>
              <SelectItem value="sans">Sans-Serif (Limpa)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={typographyDisabled ? "opacity-60" : ""}>Tamanho da fonte</Label>
          <Select
            disabled={typographyDisabled}
            value={typographyDisabled ? "normal" : (value.font_size ?? "normal")}
            onValueChange={(v) => onChange({ font_size: v as ReceiptLayoutValues["font_size"] })}
          >
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compacta (Pequena)</SelectItem>
              <SelectItem value="normal">Normal (Média)</SelectItem>
              <SelectItem value="large">Grande (Legível)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Separador</Label>
          <Select
            value={value.separator_char ?? "-"}
            onValueChange={(v) => onChange({ separator_char: v })}
          >
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="-">Traços ( - )</SelectItem>
              <SelectItem value="=">Iguais ( = )</SelectItem>
              <SelectItem value=".">Pontos ( . )</SelectItem>
              <SelectItem value="*">Asteriscos ( * )</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo de corte</Label>
          <Select
            value={value.cut_type ?? "none"}
            onValueChange={(v) => onChange({ cut_type: v as ReceiptLayoutValues["cut_type"] })}
          >
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem corte</SelectItem>
              <SelectItem value="partial">Corte parcial</SelectItem>
              <SelectItem value="full">Corte total</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Linhas em branco no final</Label>
          <Input
            type="number"
            min={0}
            max={10}
            value={value.feed_lines ?? 3}
            onChange={(e) =>
              onChange({ feed_lines: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })
            }
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Toggle label="Negrito em títulos" value={value.use_bold_titles ?? true} onChange={(v) => onChange({ use_bold_titles: v })} />
        <Toggle label="Fonte dupla no total" value={value.use_double_total ?? true} onChange={(v) => onChange({ use_double_total: v })} />
        <Toggle label="Exibir nome da loja" value={value.show_store_name ?? true} onChange={(v) => onChange({ show_store_name: v })} />
        <Toggle label="Exibir endereço" value={value.show_address ?? true} onChange={(v) => onChange({ show_address: v })} />
        <Toggle label="Exibir CNPJ/CPF" value={value.show_document ?? true} onChange={(v) => onChange({ show_document: v })} />
        <Toggle label="Exibir WhatsApp" value={value.show_whatsapp ?? true} onChange={(v) => onChange({ show_whatsapp: v })} />
        <Toggle label="Exibir PIX" value={value.show_pix ?? true} onChange={(v) => onChange({ show_pix: v })} />
        <Toggle label="Exibir Instagram" value={value.show_instagram ?? true} onChange={(v) => onChange({ show_instagram: v })} />
        <Toggle label="Exibir mensagem de agradecimento" value={value.show_thank_message ?? true} onChange={(v) => onChange({ show_thank_message: v })} />
      </div>

      {(value.show_thank_message ?? true) && (
        <div>
          <Label>Mensagem de agradecimento</Label>
          <Input
            value={value.thank_message ?? ""}
            onChange={(e) => onChange({ thank_message: e.target.value })}
            maxLength={120}
            className="mt-1.5"
          />
        </div>
      )}
    </div>
  );
}
