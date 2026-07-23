## Ajustes no fluxo de Configurações

### 1. Botão "Voltar" em todas as sub-telas
Já existe em `pagamentos` e `pedidos`. Adicionar em:
- `src/routes/admin.configuracoes.impressora.tsx` — no `action` do `AdminLayout`, inserir `<Button variant="outline" asChild><Link to="/admin/configuracoes"><ArrowLeft/> Voltar</Link></Button>` antes dos botões existentes.
- `src/routes/admin.configuracoes.promocao.tsx` — passar `action` com botão Voltar nos dois `AdminLayout` (loading e conteúdo).

Padrão visual idêntico ao já usado em `pagamentos.tsx` (ArrowLeft + "Voltar", `variant="outline"`, link para `/admin/configuracoes`).

### 2. QR Code na aba "Link público"
Em `src/routes/admin.configuracoes.index.tsx`, `TabsContent value="link"`:
- Adicionar dependência `qrcode` (gerador em canvas, leve, sem React wrapper).
- Renderizar `<canvas>` com o QR do `publicLink` (256px, margem 2, cor primária sobre branco).
- Botão "Baixar PNG" que exporta via `canvas.toDataURL()` → download `menuzin-<slug>.png`.
- Botão "Copiar" já existente permanece; adicionar também "Compartilhar" (usa `navigator.share` quando disponível, senão oculto).
- Layout: link + botões em cima, QR centralizado abaixo em card com borda `rounded-xl`.

### 3. "Salvar Configurações" + modal "Montar Cardápio"
Hoje o modal `nextStepOpen` só abre quando `onboarding=1`. Ajustes em `admin.configuracoes.index.tsx`:
- Renomear o botão do header de "Salvar" para "Salvar Configurações".
- Remover a condicional `if (onboarding) setNextStepOpen(true)` — passar a **sempre** abrir o modal "Loja configurada! Montar meu cardápio agora" após salvar com sucesso.
- Manter os dois botões do modal ("Montar meu cardápio agora" → `/admin/cardapio/novo` e "Fazer isso depois" → fecha).
- Manter o banner de boas-vindas apenas quando `onboarding=1` (comportamento atual).

### Arquivos afetados
- EDITAR: `src/routes/admin.configuracoes.impressora.tsx`
- EDITAR: `src/routes/admin.configuracoes.promocao.tsx`
- EDITAR: `src/routes/admin.configuracoes.index.tsx`
- INSTALAR: `qrcode` + `@types/qrcode`
