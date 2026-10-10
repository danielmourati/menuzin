import { createFileRoute } from "@tanstack/react-router";

const MAX_MESSAGES_PER_CONVERSATION = 80;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/public/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { z } = await import("zod");
        const body = z
          .object({
            slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
            conversationId: z.string().uuid(),
            accessKey: z.string().min(20).max(100),
            messages: z.array(z.any()).min(1),
          })
          .safeParse(await request.json().catch(() => null));
        if (!body.success) return json(400, { error: "Requisição inválida." });
        const { slug, conversationId, accessKey, messages } = body.data;

        const { checkRateLimit, recordFailedAttempt, getClientIp } = await import("@/lib/rate-limit.server");
        const rl = { key: `ai-chat:${getClientIp(request)}`, maxAttempts: 40, windowSeconds: 600, blockDurationSeconds: 600 };
        if (!checkRateLimit(rl).allowed) return json(429, { error: "Muitas mensagens em pouco tempo. Aguarde alguns minutos." });
        recordFailedAttempt(rl);

        const srv = await import("@/lib/ai-agent.server");
        const conv = await srv.getConversation(conversationId, accessKey);
        if (!conv) return json(404, { error: "Conversa não encontrada." });
        if (conv.status !== "open") return json(409, { error: "Esta conversa já virou pedido. Inicie uma nova." });
        if ((conv as any).handoff_status === "closed") return json(409, { error: "A loja encerrou este atendimento. Inicie uma nova conversa." });
        if (conv.message_count >= MAX_MESSAGES_PER_CONVERSATION) {
          return json(429, { error: "Limite de mensagens desta conversa atingido. Finalize pelo cardápio." });
        }
        const ctx = await srv.loadAgentContext(slug);
        if (!ctx || ctx.tenant.id !== conv.tenant_id) return json(403, { error: "Atendente indisponível nesta loja." });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const last = messages[messages.length - 1] as { id?: string; role: string; parts: unknown[] };
        if (last?.role !== "user" || !Array.isArray(last.parts)) return json(400, { error: "Mensagem inválida." });
        const textLen = JSON.stringify(last.parts).length;
        if (textLen > 4000) return json(400, { error: "Mensagem muito longa." });

        // Histórico confiável vem do banco; do cliente só usamos a nova mensagem.
        const { data: rows } = await supabaseAdmin
          .from("ai_messages").select("ai_message_id, role, parts").eq("conversation_id", conv.id).order("created_at");
        const history = (rows ?? []).map((r) => ({ id: r.ai_message_id ?? crypto.randomUUID(), role: r.role, parts: r.parts }));
        const userMsg = { id: last.id ?? crypto.randomUUID(), role: "user", parts: last.parts.filter((p: any) => p?.type === "text") };
        const { error: insErr } = await supabaseAdmin.from("ai_messages").insert({
          conversation_id: conv.id, ai_message_id: userMsg.id, role: "user", parts: userMsg.parts as never,
        });
        if (insErr) return json(500, { error: "Falha ao salvar a mensagem." });
        const allMessages = [...history, userMsg] as any[];

        // Cliente pediu uma pessoa por escrito: chama a loja sem depender da IA.
        let handoff = (conv as any).handoff_status ?? "none";
        const userText = (userMsg.parts as any[]).map((p) => p?.text ?? "").join(" ").toLowerCase();
        if (handoff === "none" && /(falar|conversar|chamar|quero|preciso).{0,25}(atendente|humano|pessoa|algu[eé]m da loja|gerente|dono)|\batendente humano\b/.test(userText)) {
          await srv.notifyHandoff(conv.id, conv.tenant_id);
          const ackId = crypto.randomUUID();
          await supabaseAdmin.from("ai_messages").insert({
            conversation_id: conv.id, ai_message_id: ackId, role: "assistant",
            parts: [{ type: "text", text: "Chamei alguém da loja para falar com você 🙂 Aguarde um instante, pode ir escrevendo por aqui." }] as never,
          });
          handoff = "requested";
        }
        // Atendimento humano em andamento: guarda a mensagem para a loja e não chama a IA.
        if (handoff === "requested" || handoff === "human") {
          await supabaseAdmin.from("ai_conversations")
            .update({ message_count: conv.message_count + 1, updated_at: new Date().toISOString() }).eq("id", conv.id);
          const { createUIMessageStream, createUIMessageStreamResponse } = await import("ai");
          const stream = createUIMessageStream({ execute: () => {} });
          return createUIMessageStreamResponse({ stream });
        }

        const { streamText, tool, stepCountIs, convertToModelMessages } = await import("ai");
        const { createOpenAI } = await import("@ai-sdk/openai");
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return json(500, { error: "Atendente não configurado." });
        let runId: string | undefined = request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: async (input, init) => {
            const h = new Headers(init?.headers);
            if (runId && !h.has("X-Lovable-AIG-Run-ID")) h.set("X-Lovable-AIG-Run-ID", runId);
            const res = await fetch(input, { ...init, headers: h });
            runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
            return res;
          },
        });

        const t = ctx.tenant as any;
        const savedDraft = (conv.draft as any)?.draft ?? srv.emptyDraft();
        const instructions = [
          `Você é ${ctx.settings.agent_name}, atendente virtual da loja "${t.name}" no Menuzin. Fale em português do Brasil, ${ctx.settings.tone === "formal" ? "com tom educado e formal" : "com tom simpático, leve e descontraído, como um bom atendente de delivery"}. Respostas curtas (até 4 frases), use listas só para resumir itens.`,
          "Objetivo: entender o pedido do cliente em linguagem informal e transformá-lo em dados estruturados usando a ferramenta update_draft.",
          "REGRAS:",
          "- Use SOMENTE produtos, tamanhos e opções do CARDÁPIO abaixo, sempre pelos IDs entre colchetes. Nunca invente itens, preços, cupons ou promoções.",
          "- Itens marcados (SOMENTE PELO CARDÁPIO) não podem ser pedidos aqui: oriente o cliente a pedir pelo cardápio da loja.",
          "- Se o cliente pedir algo indisponível, diga que está em falta e sugira algo parecido do cardápio.",
          "- Sempre que o cliente adicionar, remover ou mudar algo (itens, entrega, endereço, pagamento, nome, WhatsApp, cupom), chame update_draft com o rascunho COMPLETO atualizado.",
          "- Os preços e o total vêm da ferramenta; nunca calcule por conta própria. Se a ferramenta devolver 'missing' ou 'errors', pergunte ao cliente o que falta, um ponto de cada vez.",
          "- Para itens com grupos obrigatórios (ex.: sabores, carnes, acompanhamentos), pergunte as escolhas antes de concluir.",
          "- Pagamento só na entrega/retirada: dinheiro (pergunte troco), maquininha crédito, maquininha débito ou Pix manual. Pix online não está disponível neste chat. Aceite somente as formas habilitadas para esta loja, listadas abaixo.",
          `- ENDEREÇO DE ENTREGA: a loja só entrega em ${t.city ?? "sua cidade"}${t.state ? `/${t.state}` : ""}. Nunca pergunte a cidade nem o estado; preencha address.city="${t.city ?? ""}" e address.state="${t.state ?? ""}". Quando o cliente escolher entrega, peça primeiro o CEP (ou, se ele não souber, a rua). Com o CEP, chame update_draft só com o CEP: a ferramenta completa rua e bairro; confirme-os com o cliente e peça o número. Sem CEP, peça rua, depois número, depois bairro, um de cada vez. Complemento e ponto de referência são opcionais. Se o cliente citar outra cidade ou a ferramenta devolver erro de cidade/área, explique com carinho e ofereça retirada.`,
          "- Quando o cliente disser 'quero fechar' ou 'finalizar pedido', entenda que terminou de escolher itens. Confira o rascunho e conduza uma etapa por vez nesta ordem: recebimento; endereço ou mesa; pagamento e troco; nome; WhatsApp. Faça uma pergunta curta por resposta, pois a tela mostrará botões para recebimento, pagamento e troco.",
          "- Quando a ferramenta devolver ready=true, diga ao cliente para conferir o resumo que apareceu na tela e tocar em 'Confirmar pedido'. Você NÃO confirma pedidos; só o cliente confirma pelo botão.",
          "- Mensagens que começam com 🎤 são áudios transcritos; interprete com tolerância a erros de transcrição. Mensagens com 📍 trazem a localização do cliente: use rua, bairro e CEP no update_draft, confirme com o cliente e peça número/complemento.",
          "- Se o cliente pedir para falar com uma pessoa/atendente humano, ou estiver irritado com algo que você não resolve, chame a ferramenta request_human e avise com carinho que alguém da loja vai responder aqui mesmo em instantes.",
          "- Sugira no máximo um adicional ou bebida por conversa, sem insistir.",
          "- Não fale de assuntos fora da loja e do pedido.",
          `Loja: ${t.name}. Endereço: ${[t.address, t.address_number, t.neighborhood, t.city].filter(Boolean).join(", ") || "não informado"}. Aberta agora: ${t.open === false ? "não" : "sim"}.`,
          `Tempo de entrega: ${t.delivery_time_min && t.delivery_time_max ? `${t.delivery_time_min}–${t.delivery_time_max} min` : "consulte a loja"}.`,
          `RECEBIMENTO HABILITADO: ${[t.accepts_delivery && "entrega", t.accepts_takeout && "retirada", t.accepts_dinein && "consumo no local"].filter(Boolean).join(", ") || "consulte a loja"}.`,
          `PAGAMENTOS MANUAIS HABILITADOS: ${[
            ctx.paymentSettings.cash_enabled && "dinheiro",
            ctx.paymentSettings.pix_manual_enabled && "Pix manual",
            ctx.paymentSettings.card_on_delivery_enabled && "maquininha crédito ou débito",
          ].filter(Boolean).join(", ") || "consulte a loja"}.`,
          ctx.coupons.length
            ? `CUPONS VÁLIDOS: ${ctx.coupons.map((c) => `${c.code} (${c.discount_type === "percent" ? `${c.discount_value}%` : `R$ ${c.discount_value}`}${c.min_order_total ? `, mínimo R$ ${c.min_order_total}` : ""})`).join("; ")}`
            : "Não há cupons ativos.",
          ctx.inactiveNames.length ? `EM FALTA HOJE: ${ctx.inactiveNames.join(", ")}` : "",
          ctx.settings.extra_instructions ? `INSTRUÇÕES DA LOJA: ${ctx.settings.extra_instructions}` : "",
          `RASCUNHO ATUAL: ${JSON.stringify(savedDraft)}`,
          "CARDÁPIO:",
          srv.buildMenuText(ctx),
        ].filter(Boolean).join("\n");

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          instructions,
          messages: await convertToModelMessages(allMessages),
          abortSignal: request.signal,
          stopWhen: stepCountIs(50),
          tools: {
            request_human: tool({
              description: "Chama um atendente humano da loja para esta conversa. Use só quando o cliente pedir para falar com uma pessoa.",
              inputSchema: z.object({ reason: z.string() }),
              execute: async () => {
                await srv.notifyHandoff(conv.id, conv.tenant_id);
                return { ok: true };
              },
            }),
            update_draft: tool({
              description: "Salva o rascunho completo do pedido e devolve itens com preços calculados pela loja, total, campos faltando e erros.",
              inputSchema: srv.DraftSchema,
              execute: async (draft) => {
                const priced = await srv.priceDraft(ctx, slug, draft, (conv as any).customer_location ?? null);
                await supabaseAdmin.from("ai_conversations").update({
                  draft: priced as never,
                  customer_name: draft.customer_name,
                  customer_phone: draft.whatsapp,
                  updated_at: new Date().toISOString(),
                }).eq("id", conv.id);
                return {
                  ready: priced.ready, missing: priced.missing, errors: priced.errors,
                  lines: priced.lines.map((l) => ({ name: l.name, qty: l.qty, details: l.details, line_total: l.line_total })),
                  subtotal: priced.subtotal, discount: priced.discount, delivery_fee: priced.delivery_fee,
                  total: priced.total, change_back: priced.change_back, address: draft.address,
                };
              },
            }),
          },
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const res = result.toUIMessageStreamResponse({
          originalMessages: allMessages,
          onFinish: async ({ responseMessage }) => {
            const { error } = await supabaseAdmin.from("ai_messages").insert({
              conversation_id: conv.id,
              ai_message_id: responseMessage.id,
              role: "assistant",
              parts: responseMessage.parts.filter((p: any) => p.type !== "reasoning") as never,
            });
            if (error) console.error("[ai-chat] falha ao salvar resposta", error.message);
            await supabaseAdmin.from("ai_conversations")
              .update({ message_count: conv.message_count + 2, updated_at: new Date().toISOString() })
              .eq("id", conv.id);
          },
          onError: (e) => {
            const msg = String((e as Error)?.message ?? e);
            console.error("[ai-chat]", msg);
            if (/402|credit/i.test(msg)) return "O atendente está indisponível no momento. Finalize pelo cardápio.";
            if (/429/.test(msg)) return "Muita gente falando comigo agora. Tente de novo em instantes.";
            return "Tive um problema para responder. Tente novamente ou finalize pelo cardápio.";
          },
        });
        return res;
      },
    },
  },
});
