## Substituir CTAs de WhatsApp na home pelo modal de cadastro

### Botões afetados
| Local | Antes | Depois |
|---|---|---|
| `src/routes/index.tsx` — Hero | "Falar no WhatsApp" (wa.me) | 🚀 "Criar meu cardápio grátis" (abre modal) |
| `src/routes/index.tsx` — Plano Presença | "Cadastrar grátis" (wa.me) | idem |
| `src/routes/index.tsx` — Plano Start | "Começar a vender" (wa.me) | idem |
| `src/routes/index.tsx` — Plano Pro | "Profissionalizar meu delivery" (wa.me) | idem |
| `LandingSections.tsx` — `CTABanner` | "Falar com a gente" (wa.me) | idem (variant `secondary`) |

### Fora do escopo (mantidos)
- `WhatsAppFloatingButton` (suporte).
- `ContactSpecialistSection` (formulário de lead).
- Link e telefone no rodapé (contato institucional).
- Header "Começar Agora" (âncora `#plans`).

### Implementação
1. `src/routes/index.tsx`:
   - Importar `QuickSignupModal` e `Rocket` (lucide-react).
   - `const [signupOpen, setSignupOpen] = useState(false)`.
   - Trocar os 4 `<Button asChild><a href={WHATSAPP_CONTACT_URL}>` (hero + 3 planos) por `<Button onClick={() => setSignupOpen(true)}><Rocket/> Criar meu cardápio grátis</Button>`, preservando `size`/`variant` de cada local.
   - Renderizar `<QuickSignupModal open={signupOpen} onOpenChange={setSignupOpen} />` no fim do componente.
   - Passar `onCTAClick={() => setSignupOpen(true)}` para `<CTABanner />`.
   - Remover import `WHATSAPP_CONTACT_URL` se ficar sem uso.
2. `src/components/landing/LandingSections.tsx`:
   - `CTABanner` recebe `onCTAClick?: () => void`; quando fornecido, dispara handler em vez do link wa.me.
   - Manter `WHATSAPP_CONTACT_URL` (ainda usado por `LandingFooter` e `ContactSpecialistSection`).

### Verificação
- `tsgo` para tipos; conferir no preview que cada botão abre o modal de 3 etapas.
