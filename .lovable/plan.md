## Ajustes CTAs da home

### 1. Hierarquia visual dos CTAs (mesma cor primary)
No hero, os dois botões ("Ver loja demo" e "Criar meu cardápio grátis") estão ambos `primary` sólido laranja, sem hierarquia. Padrão UX/UI: um CTA primário sólido + um secundário `outline`.

- **Ver loja demo** → mantém `variant="default"` (primário sólido). É a ação exploratória mais leve? Não — a ação principal é "Criar meu cardápio grátis". Então inverter:
  - **Criar meu cardápio grátis** → `variant="default"` (primário sólido, laranja).
  - **Ver loja demo** → `variant="outline"` (secundário).
- Aplicar mesma lógica no `CTABanner` (já `variant="secondary"`, fica) — sem alteração.

### 2. Reverter CTAs dos planos Start e Pro para WhatsApp
Apenas o plano **Presença** mantém o botão 🚀 "Criar meu cardápio grátis" (abre `QuickSignupModal`).

Restaurar em `src/routes/index.tsx` no bloco `pricingPlans.map`:
- **Start** → `<a href={WHATSAPP_CONTACT_URL}>` com texto original `p.cta` ("Começar a vender"), ícone `MessageCircle`.
- **Pro** → idem, texto `p.cta` ("Profissionalizar meu delivery").
- **Presença** → mantém `onClick={() => setSignupOpen(true)}` com `Rocket` + "Criar meu cardápio grátis".

Reimportar `WHATSAPP_CONTACT_URL` em `src/routes/index.tsx`.

### Arquivos alterados
- `src/routes/index.tsx` — hero: swap de variants; planos: condicional por `p.id === "presenca"`.

### Verificação
- Preview em `/`: hero com botão laranja sólido (Criar cardápio) + outline (Ver demo); cards Start/Pro voltam a abrir WhatsApp; Presença abre modal.
