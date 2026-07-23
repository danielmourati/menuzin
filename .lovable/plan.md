## Escopo

Quatro ajustes de UX em fluxos de cadastro/edição.

### 1. Olhinho nas senhas do modal de cadastro
Em `src/components/landing/QuickSignupModal.tsx`, trocar os dois `<Input type="password">` (Senha e Confirmar senha) pelo componente já existente `PasswordInput` (`src/components/ui/password-input.tsx`), que já implementa o toggle de mostrar/ocultar.

### 2. Inputs de imagem no wizard (anexo 1)
Em `src/components/guia/ImagePickerField.tsx`:
- Substituir o layout atual (toggle Upload/URL em pill separada) por um cabeçalho com duas abas segmentadas mais claras, alinhadas à largura do campo.
- Quando modo Upload: mostrar botão único cheio "Escolher do dispositivo" com ícone, sem sobrepor a label "Preço" (o texto está vazando por causa da altura do bloco). Ajustar espaçamento e `min-height` para caber ao lado do campo Nome sem colidir.
- Quando modo URL: input de URL em linha própria, ocupando 100% da largura do campo.
- Manter dica de dimensões/formatos abaixo.

O objetivo é que o bloco Imagem fique auto-contido e não invada os campos vizinhos (Nome/Preço).

### 3. Wizard Novo Cardápio — Passo 2 → Passo 3 (anexo 2)
Em `src/routes/admin.cardapio.novo.tsx`:
- No passo Categoria: bloquear nomes duplicados (case-insensitive, trim) ao criar; exibir erro inline e desabilitar botão Avançar.
- No passo Produto: remover o botão "Voltar" (para não permitir voltar e editar a categoria recém criada). Substituir por botão "Pular" ou apenas manter Salvar/Adicionar outro/Concluir.
- Adicionar botão explícito **"Finalizar cadastro"** que leva ao passo 3 (Pronto) — hoje o passo Concluir salva mas não necessariamente encaminha o fluxo. Garantir que ao clicar Finalizar, salva o produto atual (se houver campos preenchidos) e navega para o passo Pronto com os CTAs Preview/Publicar já existentes.

### 4. Modal de confirmação (anexo 3)
Substituir todos os `window.confirm(...)` por um `AlertDialog` (shadcn, já instalado em `src/components/ui/alert-dialog.tsx`).

Abordagem: criar hook utilitário `src/hooks/useConfirm.tsx` que expõe:
```ts
const { confirm, ConfirmDialog } = useConfirm();
// await confirm({ title, description, confirmText, variant: "destructive" })
```
E renderiza `<ConfirmDialog />` uma vez no componente.

Arquivos a migrar (10):
- `src/routes/admin.adicionais.tsx`
- `src/routes/admin.taxas-entrega.tsx`
- `src/routes/admin.categorias.tsx`
- `src/routes/admin.cupons.tsx`
- `src/routes/admin.observacoes.tsx`
- `src/routes/admin.produtos.tsx`
- `src/routes/platform.guia.solicitacoes.tsx`
- `src/routes/platform.guia.slots.tsx`
- `src/routes/platform.guia.categorias.tsx`
- `src/components/admin/PizzaCategoryConfigDialog.tsx`

Cada `if (!confirm("Excluir X?")) return;` vira `if (!(await confirm({ title: "Excluir X?", variant: "destructive" }))) return;`.

## Fora do escopo
- Nenhuma alteração de schema, RLS ou lógica de negócio.
- Sem novos endpoints.
