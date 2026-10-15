import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Ticket,
  Sparkles,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  RotateCcw,
  Zap,
  Gift,
  Send,
  Eye,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/whatsapp-link";
import type { CouponRow } from "@/lib/coupons.functions";

export interface CouponShareModalProps {
  coupon: CouponRow | null;
  tenant: {
    id?: string;
    name?: string;
    slug?: string;
    logo_url?: string | null;
    cover_url?: string | null;
  } | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleActive?: (id: string, active: boolean) => void;
  isTogglingActive?: boolean;
}

export type PresetKey = "voucher" | "relampago" | "presente" | "direto";

export interface CouponPreset {
  key: PresetKey;
  label: string;
  icon: string;
  description: string;
  template: string;
}

export const COUPON_PRESETS: CouponPreset[] = [
  {
    key: "voucher",
    label: "Voucher Oficial",
    icon: "🎟️",
    description: "Estilo cupom / tíquete com bordas e formatação clássica",
    template: `🎟️━━━━━━━━━━━━━━━━━━🎟️
   *CUPOM DE DESCONTO EXCLUSIVO*
🎟️━━━━━━━━━━━━━━━━━━🎟️

🏪 *{loja}*

🎉 *{desconto}* no seu pedido!
🏷️ Código do Cupom: *{cupom}*

┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
📋 *Condições do Cupom:*
{regras}
• Desconto aplicado automaticamente no checkout!
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈

👇 *Toque no link abaixo para resgatar:*
{link}

_Aproveite agora e bom apetite!_ 😋🍕`,
  },
  {
    key: "relampago",
    label: "Oferta Relâmpago",
    icon: "⚡",
    description: "Gera urgência com relógio e tempo limitado",
    template: `⚡ *OFERTA RELÂMPAGO NA {loja}!* ⚡
━━━━━━━━━━━━━━━━━━━━
🔥 Ganhe *{desconto}* agora mesmo!
🏷️ Use o código: *{cupom}*

⏳ *Atenção:* Válido por tempo limitado!
{regras}

👇 *Toque no link abaixo para pedir com desconto:*
{link}

_Corre antes que acabe!_ 🏃💨`,
  },
  {
    key: "presente",
    label: "Presente VIP",
    icon: "🎁",
    description: "Mimo especial e exclusivo para clientes fiéis",
    template: `🎁 *Você ganhou um mimo especial da {loja}!*
━━━━━━━━━━━━━━━━━━━━
Preparamos um desconto exclusivo especialmente para você:
✨ *{desconto}* com o cupom *{cupom}*!

{regras}

👇 *Ative seu cupom direto pelo link:*
{link}

Esperamos você! ❤️`,
  },
  {
    key: "direto",
    label: "Mensagem Rápida",
    icon: "💬",
    description: "Direta ao ponto com o link do cupom",
    template: `Olá! Segue seu cupom de *{desconto}* na *{loja}*:
🏷️ Cupom: *{cupom}*
{regras}

Acesse pelo link para ativar automaticamente:
{link}`,
  },
];

const QUICK_EMOJIS = ["🎟️", "🎫", "🏷️", "🎁", "🔥", "⚡", "⏳", "🛵", "🍕", "🍔", "✨", "⭐", "👇"];

const TEMPLATE_TAGS = [
  { tag: "{loja}", label: "Nome da Loja" },
  { tag: "{cupom}", label: "Código do Cupom" },
  { tag: "{desconto}", label: "Desconto" },
  { tag: "{regras}", label: "Regras/Validade" },
  { tag: "{link}", label: "Link do Cupom" },
];

function buildRulesText(c: CouponRow): string {
  const rules: string[] = [];
  if (c.valid_until) {
    rules.push(`• Válido até: ${new Date(c.valid_until).toLocaleDateString("pt-BR")}`);
  } else {
    rules.push(`• Sem prazo de validade`);
  }
  if (Number(c.min_order_total) > 0) {
    rules.push(`• Pedido mínimo: ${brl(Number(c.min_order_total))}`);
  } else {
    rules.push(`• Sem valor mínimo de pedido`);
  }
  return rules.join("\n");
}

function compileTemplate(
  template: string,
  c: CouponRow,
  tenantName: string,
  link: string,
): string {
  const discount =
    c.discount_type === "percent"
      ? `${Number(c.discount_value)}% OFF`
      : `${brl(Number(c.discount_value))} OFF`;
  const regras = buildRulesText(c);

  return template
    .replace(/{loja}/g, tenantName)
    .replace(/{cupom}/g, c.code)
    .replace(/{desconto}/g, discount)
    .replace(/{regras}/g, regras)
    .replace(/{link}/g, link);
}

export function CouponShareModal({
  coupon,
  tenant,
  open,
  onOpenChange,
  onToggleActive,
  isTogglingActive,
}: CouponShareModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("voucher");
  const [customText, setCustomText] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const storeName = tenant?.name || "nossa loja";
  const slug = tenant?.slug || "";

  const getCouponLink = (code: string) => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    return `${origin}/${slug}/cupons?cupom=${encodeURIComponent(code)}`;
  };

  const currentLink = coupon ? getCouponLink(coupon.code) : "";

  // Carrega template do localStorage ou usa o preset padrão ao abrir
  useEffect(() => {
    if (!coupon || !open) return;
    const storageKey = `menuzin_coupon_share_tpl_${tenant?.id || "default"}`;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    const baseTemplate = saved || COUPON_PRESETS[0].template;
    setCustomText(compileTemplate(baseTemplate, coupon, storeName, currentLink));
  }, [coupon, open, tenant?.id, storeName, currentLink]);

  const handleSelectPreset = (p: CouponPreset) => {
    if (!coupon) return;
    setSelectedPreset(p.key);
    const compiled = compileTemplate(p.template, coupon, storeName, currentLink);
    setCustomText(compiled);
    // Salva no localStorage para lembrar a preferência do lojista
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`menuzin_coupon_share_tpl_${tenant?.id || "default"}`, p.template);
    }
  };

  const handleResetToDefault = () => {
    if (!coupon) return;
    const preset = COUPON_PRESETS.find((p) => p.key === selectedPreset) || COUPON_PRESETS[0];
    const compiled = compileTemplate(preset.template, coupon, storeName, currentLink);
    setCustomText(compiled);
    toast.success("Mensagem restaurada para o modelo padrão!");
  };

  const handleInsertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setCustomText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? customText.length;
    const end = el.selectionEnd ?? customText.length;
    const next = customText.slice(0, start) + emoji + customText.slice(end);
    setCustomText(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  };

  const handleInsertTag = (tag: string) => {
    const el = textareaRef.current;
    let replacement = tag;
    if (coupon) {
      if (tag === "{loja}") replacement = storeName;
      if (tag === "{cupom}") replacement = coupon.code;
      if (tag === "{desconto}")
        replacement =
          coupon.discount_type === "percent"
            ? `${Number(coupon.discount_value)}% OFF`
            : `${brl(Number(coupon.discount_value))} OFF`;
      if (tag === "{regras}") replacement = buildRulesText(coupon);
      if (tag === "{link}") replacement = currentLink;
    }

    if (!el) {
      setCustomText((prev) => prev + " " + replacement);
      return;
    }
    const start = el.selectionStart ?? customText.length;
    const end = el.selectionEnd ?? customText.length;
    const next = customText.slice(0, start) + replacement + customText.slice(end);
    setCustomText(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 10);
  };

  const copyDirectLink = async () => {
    if (!currentLink) return;
    try {
      await navigator.clipboard.writeText(currentLink);
      setCopiedLink(true);
      toast.success("Link do cupom copiado!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const copyFormattedMessage = async () => {
    if (!customText) return;
    try {
      await navigator.clipboard.writeText(customText);
      setCopiedMessage(true);
      toast.success("Mensagem do cupom copiada com formatação e emojis!");
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      toast.error("Não foi possível copiar a mensagem.");
    }
  };

  const sendViaWhatsApp = () => {
    if (!customText) return;
    window.open(buildWhatsAppLink(null, customText), "_blank", "noopener");
  };

  if (!coupon) return null;

  const discountBadge =
    coupon.discount_type === "percent"
      ? `${Number(coupon.discount_value)}% OFF`
      : `${brl(Number(coupon.discount_value))} OFF`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                <Ticket className="h-4 w-4" />
              </span>
              <span>Divulgar Cupom:</span>
              <span className="font-mono text-primary font-extrabold">{coupon.code}</span>
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {discountBadge}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Personalize a mensagem com cara de cupom oficial, escolha emojis e divulgue pelo WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {/* Alerta caso o cupom esteja desativado */}
        {!coupon.active && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Este cupom está desativado</p>
              <p className="mt-0.5 opacity-90 text-[11px]">
                Clientes que receberem o link verão o aviso de indisponibilidade até que você ative o cupom.
              </p>
            </div>
            {onToggleActive && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs bg-background shrink-0"
                onClick={() => onToggleActive(coupon.id, true)}
                disabled={isTogglingActive}
              >
                Ativar agora
              </Button>
            )}
          </div>
        )}

        {/* Seletor de Modelo / Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Estilo da Mensagem (Modelos Prontos)
            </Label>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restaurar padrão</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COUPON_PRESETS.map((p) => {
              const isSelected = selectedPreset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/20 shadow-xs"
                      : "border-border/60 hover:border-primary/40 bg-card hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-xs font-medium leading-tight">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Abas: Editor & Pré-visualização WhatsApp */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
          <div className="flex items-center justify-between gap-2 border-b pb-1">
            <TabsList className="h-8">
              <TabsTrigger value="edit" className="text-xs gap-1.5 h-7 px-3">
                <Edit3 className="h-3.5 w-3.5" />
                <span>Editar Mensagem</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs gap-1.5 h-7 px-3">
                <Eye className="h-3.5 w-3.5" />
                <span>Pré-visualização WhatsApp</span>
              </TabsTrigger>
            </TabsList>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              {customText.length} caracteres
            </span>
          </div>

          {/* Aba de Edição */}
          <TabsContent value="edit" className="space-y-3 pt-2">
            {/* Barra de Emojis Rápidos */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Inserir emoji:</span>
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleInsertEmoji(emoji)}
                  className="grid h-7 w-7 place-items-center rounded-lg border bg-card hover:bg-muted text-sm transition active:scale-95"
                  title={`Inserir ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Inserção de Variáveis */}
            <div className="flex items-center gap-1 flex-wrap text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Inserir dados:</span>
              {TEMPLATE_TAGS.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => handleInsertTag(t.tag)}
                  className="rounded-md border bg-muted/40 hover:bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition"
                >
                  +{t.label}
                </button>
              ))}
            </div>

            {/* Textarea editável */}
            <div className="space-y-1">
              <Textarea
                ref={textareaRef}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={9}
                className="font-mono text-xs leading-relaxed resize-y bg-muted/20"
                placeholder="Escreva a mensagem personalizada do cupom..."
              />
              <p className="text-[10px] text-muted-foreground">
                Dica: O WhatsApp formata negrito com <code className="bg-muted px-1 rounded">*palavra*</code> e itálico com <code className="bg-muted px-1 rounded">_palavra_</code>.
              </p>
            </div>
          </TabsContent>

          {/* Aba de Pré-visualização Realista WhatsApp */}
          <TabsContent value="preview" className="pt-2">
            <div className="rounded-2xl p-4 sm:p-5 bg-[#EFEAE2] dark:bg-[#0B141A] border shadow-inner">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 mb-2.5 text-center">
                Simulação da mensagem no WhatsApp
              </p>

              {/* Balão do WhatsApp */}
              <div className="max-w-md mx-auto rounded-2xl rounded-tr-sm bg-[#D9FDD3] dark:bg-[#005C4B] p-3 text-foreground shadow-sm border border-emerald-600/10 dark:border-emerald-400/10">
                {/* Card de Link OpenGraph (WhatsApp Link Preview) */}
                <div className="mb-2.5 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                  <div className="flex items-center gap-3 p-2.5 bg-black/[0.02] dark:bg-white/[0.02]">
                    {tenant?.logo_url ? (
                      <img
                        src={tenant.logo_url}
                        alt={storeName}
                        className="h-12 w-12 rounded-lg object-cover shrink-0 border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-xl font-bold text-primary">
                        🎟️
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        🎟️ Cupom {coupon.code} — {storeName}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        Aproveite seu cupom de {discountBadge} no cardápio de {storeName}. Toque para resgatar!
                      </p>
                      <span className="text-[10px] text-muted-foreground/80 lowercase mt-0.5 block">
                        menuzin.app
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corpo formatado da mensagem */}
                <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-900 dark:text-slate-100 break-words">
                  {customText.split("\n").map((line, idx) => {
                    const isPerforation = line.includes("━━") || line.includes("┈┈") || line.includes("┄┄");
                    return (
                      <div
                        key={idx}
                        className={isPerforation ? "font-mono font-bold text-emerald-800 dark:text-emerald-300 py-0.5 opacity-90" : ""}
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end items-center gap-1 text-[10px] text-muted-foreground/80 mt-1.5">
                  <span>Agora</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Link Direto Rápido */}
        <div className="space-y-1.5 pt-1">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Link direto com cupom ativo
          </Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={currentLink}
              className="h-9 text-xs font-mono bg-muted/30 select-all"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 px-3 gap-1.5 text-xs font-semibold shrink-0"
              onClick={copyDirectLink}
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Link</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button
            type="button"
            className="h-11 flex-1 gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            onClick={sendViaWhatsApp}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Divulgar no WhatsApp</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 gap-1.5 rounded-xl font-semibold text-xs shrink-0"
            onClick={copyFormattedMessage}
          >
            {copiedMessage ? (
              <>
                <Check className="h-4 w-4 text-primary" />
                <span>Mensagem Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copiar Mensagem</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 gap-1.5 rounded-xl text-xs text-muted-foreground"
            asChild
          >
            <a href={currentLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Testar</span>
            </a>
          </Button>
        </div>

        <DialogFooter className="sm:justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
