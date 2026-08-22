import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  LifeBuoy,
  Sparkles,
  Bot,
  User,
  ChevronRight,
  ExternalLink,
  Printer,
  Package,
  CreditCard,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  WHATSAPP_PHONE_DISPLAY,
  buildWhatsAppUrl,
} from "@/components/WhatsAppFloatingButton";
import { submitSupportMessage } from "@/lib/support.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const EVENT_OPEN_SUPPORT_CHAT = "menuzin:open-support-chat";

export function openSupportChat() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_OPEN_SUPPORT_CHAT));
  }
}

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
  options?: Array<{ label: string; action: string; icon?: React.ComponentType<{ className?: string }> }>;
  timestamp: string;
};

const INITIAL_BOT_MESSAGE: Message = {
  id: "msg-1",
  sender: "bot",
  text: "Olá! 👋 Sou o assistente virtual do Menuzin. Como posso te ajudar hoje?",
  options: [
    { label: "Dúvidas sobre Pedidos & Impressora", action: "faq_printer", icon: Printer },
    { label: "Como cadastrar produtos & cardápio", action: "faq_menu", icon: Package },
    { label: "Planos e Assinatura", action: "faq_plans", icon: CreditCard },
    { label: "Falar com suporte no WhatsApp", action: "action_wpp", icon: ExternalLink },
    { label: "Enviar mensagem / Ticket", action: "action_form", icon: Send },
  ],
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export function SupportChatWidget() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_BOT_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [name, setName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formSent, setFormSent] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(EVENT_OPEN_SUPPORT_CHAT, handleOpen);
    return () => window.removeEventListener(EVENT_OPEN_SUPPORT_CHAT, handleOpen);
  }, []);

  useEffect(() => {
    if (profile?.full_name && !name) setName(profile.full_name);
    if (profile?.email && !email) setEmail(profile.email);
  }, [profile, name, email]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping, showForm]);

  const addBotResponse = (text: string, options?: Message["options"]) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text,
          options,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 600);
  };

  const handleOptionClick = (option: { label: string; action: string }) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: option.label,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    switch (option.action) {
      case "faq_printer":
        addBotResponse(
          "Para configurar sua impressora térmica no Menuzin:\n1. Acesse 'Configurações > Impressora'.\n2. Instale o QZ Tray caso ainda não o tenha rodando.\n3. Selecione a impressora e o tamanho de papel (58mm ou 80mm).\n4. Teste a impressão usando o botão de teste!",
          [
            { label: "Falar com suporte no WhatsApp", action: "action_wpp", icon: ExternalLink },
            { label: "Voltar ao menu inicial", action: "reset_menu", icon: RefreshCw },
          ]
        );
        break;

      case "faq_menu":
        addBotResponse(
          "Para organizar seu cardápio:\n1. Crie primeiro suas **Categorias** (ex: Bebidas, Lanches).\n2. Adicione **Grupos de Adicionais** se os produtos tiverem opcionais.\n3. Cadastre os **Produtos** vinculando a suas respectivas categorias.\n\nDica: Use o 'Assistente Novo Cardápio' no menu lateral para criar tudo rápido!",
          [
            { label: "Falar com suporte no WhatsApp", action: "action_wpp", icon: ExternalLink },
            { label: "Voltar ao menu inicial", action: "reset_menu", icon: RefreshCw },
          ]
        );
        break;

      case "faq_plans":
        addBotResponse(
          "O Menuzin oferece planos flexíveis para alavancar seu restaurante!\n- **Plano Pro**: Pedidos ilimitados, todas as integrações, suporte prioritário.\n- Gerencie sua assinatura em 'Personalização > Minha assinatura'.",
          [
            { label: "Falar com suporte no WhatsApp", action: "action_wpp", icon: ExternalLink },
            { label: "Voltar ao menu inicial", action: "reset_menu", icon: RefreshCw },
          ]
        );
        break;

      case "action_wpp":
        window.open(
          buildWhatsAppUrl("Olá! Preciso de ajuda com meu estabelecimento no Menuzin."),
          "_blank"
        );
        addBotResponse(
          `Abrindo o WhatsApp para atendimento direto no número ${WHATSAPP_PHONE_DISPLAY}... Se a janela não abriu, você pode clicar no botão abaixo:`,
          [
            { label: "Abrir WhatsApp novamente", action: "action_wpp", icon: ExternalLink },
            { label: "Voltar ao menu inicial", action: "reset_menu", icon: RefreshCw },
          ]
        );
        break;

      case "action_form":
        setShowForm(true);
        addBotResponse("Preencha o formulário abaixo que nossa equipe responderá em breve!");
        break;

      case "reset_menu":
        setShowForm(false);
        setMessages([INITIAL_BOT_MESSAGE]);
        break;

      default:
        break;
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !messageText.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSubmitting(true);
    try {
      await submitSupportMessage({
        data: {
          name,
          email,
          whatsapp,
          subject,
          message: messageText,
          website: "",
        },
      });

      setFormSent(true);
      setShowForm(false);
      toast.success("Mensagem enviada com sucesso!");

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          sender: "user",
          text: `Mensagem enviada: "${subject}"`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      addBotResponse(
        "Recebemos sua mensagem! Nossa equipe responderá no seu e-mail em breve. Se precisar de atendimento urgente, pode nos chamar no WhatsApp.",
        [
          { label: "Falar no WhatsApp", action: "action_wpp", icon: ExternalLink },
          { label: "Menu Principal", action: "reset_menu", icon: RefreshCw },
        ]
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante (Canto Inferior Direito) */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Abrir Suporte Menuzin"
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/30"
          >
            <MessageCircle className="h-7 w-7 transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-background" />
            </span>
          </button>
        )}
      </div>

      {/* Janela Modal do Chatbot */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[540px] w-[360px] sm:w-[400px] flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header do Chatbot */}
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3.5 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <Bot className="h-6 w-6 text-white" />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-none">Suporte Menuzin</h3>
                <p className="mt-1 text-xs text-primary-foreground/80 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Assistente Virtual · Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-primary-foreground/80 hover:bg-white/10 hover:text-white transition"
              aria-label="Fechar suporte"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Área de Mensagens do Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`flex items-start gap-2 max-w-[85%] ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border text-muted-foreground"
                    }`}
                  >
                    {msg.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card border text-card-foreground rounded-tl-none whitespace-pre-line"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                <span className="mt-1 px-1 text-[10px] text-muted-foreground">
                  {msg.timestamp}
                </span>

                {/* Opções Interativas (FAQ / Botões de Ação) */}
                {msg.options && msg.options.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5 w-full pl-9">
                    {msg.options.map((opt, i) => {
                      const Icon = opt.icon || ChevronRight;
                      return (
                        <button
                          key={i}
                          onClick={() => handleOptionClick(opt)}
                          className="flex items-center justify-between rounded-xl border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs transition hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-[0.98]"
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                            {opt.label}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Animação Digitando */}
            {isTyping && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs pl-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1 rounded-full bg-card border px-3 py-1.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            {/* Formulário de Suporte Embutido */}
            {showForm && !formSent && (
              <form
                onSubmit={handleFormSubmit}
                className="mt-3 rounded-2xl border bg-card p-3.5 shadow-sm space-y-3"
              >
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <LifeBuoy className="h-4 w-4 text-primary" /> Enviar Ticket para a Equipe
                </h4>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Seu Nome *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-0.5 w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Seu E-mail *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-0.5 w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Assunto *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Dúvida com impressora"
                    required
                    className="mt-0.5 w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Mensagem *</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={3}
                    placeholder="Descreva sua dúvida com detalhes..."
                    required
                    className="mt-0.5 w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-lg border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" /> Enviar
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer de Ação Rápida WhatsApp */}
          <div className="border-t bg-card p-3">
            <a
              href={buildWhatsAppUrl("Olá! Preciso de atendimento pelo suporte do Menuzin.")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-[#20bd5a] active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4 fill-white" strokeWidth={0} />
              Falar no WhatsApp Direct
            </a>
          </div>
        </div>
      )}
    </>
  );
}
