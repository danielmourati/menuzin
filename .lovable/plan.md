
# Uploads de imagens no Guia Menuzin (superadmin)

Objetivo: permitir que o superadmin escolha, para cada slot/categoria, entre **emoji + gradiente** (atual) ou **imagem real** — enviada do dispositivo local (data URL) ou colada como link. Cada tipo de conteúdo mostra a proporção/tamanho sugerido.

Como ainda estamos em modo mock (localStorage), o upload local será armazenado como **data URL (base64)** no próprio mock store — sem Supabase Storage. Fica pronto para trocar por bucket real depois.

## 1. Modelo (src/lib/guia-mock.ts)

Adicionar campos opcionais em `GuiaSlot` e `GuiaCategory`:

- `imageUrl?: string` — URL http(s) ou `data:image/...;base64,...`
- `imageFit?: "cover" | "contain"` (default `cover`)

Manter `emoji` e `gradient` como fallback quando `imageUrl` não existir. Sem migração — o seed atual continua válido.

Tabela de dimensões sugeridas por `kind` (exportada como `SLOT_IMAGE_SPECS`):

```text
hero          1600×900   (16:9)   até 400KB
featured       800×800   (1:1)    até 250KB
top_stores     400×400   (1:1)    até 150KB  (logo/ícone da loja)
banner        1920×640   (3:1)    até 500KB
collection    1200×800   (3:2)    até 350KB
flash_offer    800×600   (4:3)    até 250KB
category       200×200   (1:1)    até 80KB
```

Constante única com `{ width, height, ratio, maxKB, hint }` consumida pelo formulário e pelo card de preview.

## 2. Componente reutilizável `ImagePickerField`

Novo arquivo `src/components/guia/ImagePickerField.tsx`:

- Toggle **Emoji + gradiente** ↔ **Imagem**
- Modo imagem: dois inputs
  - `<input type="file" accept="image/*">` → converte pra data URL via `FileReader`
  - Campo de texto "Colar URL da imagem"
- Preview 1:1 com a imagem escolhida e badge com a proporção
- Bloco de dicas: "Recomendado: 1600×900 px (16:9), até 400KB. JPG ou PNG."
- Validação leve: se `File.size > maxKB*1024` avisa via `toast.warning` (não bloqueia, só sugere reduzir); rejeita não-imagens.
- Botão "Remover imagem" (volta ao modo emoji).

## 3. Formulários existentes

**`src/components/guia/SlotFormDialog.tsx`**: incluir `ImagePickerField` recebendo `kind` para buscar o spec correspondente; salva `imageUrl`/`imageFit` no slot.

**`src/routes/platform.guia.categorias.tsx`**: mesmo componente com spec `category`, permitindo trocar o emoji por um ícone/imagem.

## 4. Renderização

**`src/components/guia/SlotCard.tsx`**: quando `slot.imageUrl` existir, renderiza `<img>` com `object-cover`/`object-contain` sobre o fundo com gradiente (usado como fallback/letterbox). Mantém emoji + textos sobrepostos apenas para `hero`, `banner`, `collection` (mesma composição atual); para `featured`, `top_stores`, `flash_offer` a imagem substitui a arte gradiente.

**`src/routes/guia.index.tsx`**: onde hoje lê `slot.gradient`/`slot.emoji`, passar tudo pro `SlotCard` (já centraliza render). Categorias na home passam a exibir `category.imageUrl` quando presente, senão o emoji.

## 5. Notas técnicas

- Data URLs no localStorage: total do mock fica em ~5MB do quota; se `JSON.stringify(state).length` passar de 4MB, mostrar aviso ao salvar ("armazenamento local quase cheio — considere usar URLs externas").
- SSR-safe: `FileReader` só roda no handler `onChange` (client-only).
- Sem alterações em server functions, migrations ou rotas públicas do Guia.

## Fora de escopo

- Upload real pra Supabase Storage (fica pra quando migrarmos o mock).
- Crop/redimensionamento no cliente.
- Otimização/CDN.
