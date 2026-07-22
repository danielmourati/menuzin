## 1. Sidebar admin fixa com scroll só no conteúdo
Em `src/components/admin/AdminLayout.tsx`:
- Wrapper externo: trocar `flex min-h-screen` por `flex h-screen overflow-hidden`.
- `<aside>` desktop: adicionar `h-screen sticky top-0` (fica fixa; botões "Ver loja pública" e "Sair" sempre visíveis no rodapé do sidebar).
- Container direito (`<div className="flex flex-1 flex-col min-w-0">`): adicionar `h-screen overflow-y-auto` para rolar apenas o lado direito. Header continua `sticky top-0` dentro dessa coluna.
- `SidebarInner` já é `flex h-full flex-col`; o bloco de conteúdo (`Nav`) mantém `flex-1 overflow-y-auto` para caso o menu cresça, sem empurrar o rodapé.

## 2. Ícone do item "Novo (assistente)"
Em `AdminLayout.tsx`:
- Trocar import `Sparkles` por `ListChecks` (lista com checks — remete a passo-a-passo guiado).
- Atualizar a entrada da seção Cardápio para usar `icon: ListChecks`.

## 3. Som de notificação fixo para todos os tenants
URL alvo: `https://fetiqngwjgxajtqjaolb.supabase.co/storage/v1/object/public/tenant-assets/c20339c0-de58-4988-a028-cce26b10b7f0/notifications/56f5cbca-1235-4f74-b0d8-75b4cadb3a61.mp3`.

Abordagem 100% frontend (sem migração/servidor):
- Em `src/lib/order-alert-sound.ts`: definir constante `DEFAULT_ALERT_URL` com esse link e usá-la como fallback padrão do player (quando nenhum override estiver setado).
- Em `src/hooks/useNotificationPrefs.ts`: sempre forçar `customAlertDataUrl = DEFAULT_ALERT_URL` (ignorar valor por tenant vindo de `getMyTenant`) e travar o override via `setAlertSoundOverride(DEFAULT_ALERT_URL)`. Isso garante que todos os tenants — inclusive os que já salvaram som personalizado — passem a tocar o mesmo áudio, sem precisar mexer no banco.
- Efeito colateral esperado na UI de preferências de notificação: o campo de som personalizado deixa de ter efeito. Não vou remover o componente agora (fora do escopo) — só neutralizo o efeito. Se quiser esconder o card, digo depois.

## 4. Toggle único de visualização no storefront
Em `src/routes/$slug.tsx` (linhas ~554–575):
- Substituir o par de botões grid/list por **um único botão** que alterna o modo (ícone muda conforme o estado atual: se está em `list` mostra `LayoutGrid` — "ver em grade"; se está em `grid` mostra `List` — "ver em lista").
- Manter default `list`, manter `aria-label` dinâmico e o estilo de pill/primary já usado.
- Nenhum outro toggle duplicado foi encontrado; a rota `loja.$slug.tsx` não tem esse controle.

## Técnico
Arquivos editados:
- `src/components/admin/AdminLayout.tsx`
- `src/lib/order-alert-sound.ts`
- `src/hooks/useNotificationPrefs.ts`
- `src/routes/$slug.tsx`

Sem migração de banco, sem novas dependências.
