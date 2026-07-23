Problema: no Passo 2 do assistente `/admin/cardapio/novo`, o campo de upload de imagem está dentro de um grid de duas colunas (`sm:grid-cols-[120px_1fr]`). O conteúdo do upload (botão "Escolher do dispositivo" + legenda) excede os 120px da coluna da imagem e invade a área do Nome/Preço, conforme o anexo.

Solução: isolar o upload de imagem em uma `div` separada, fora do grid de duas colunas, para que ocupe a largura total disponível e não haja mais overflow.

Ações:
1. Em `src/routes/admin.cardapio.novo.tsx`, no Passo 2 (`step === 2`), alterar o layout do formulário de produto:
   - Mover o bloco `<Label>Imagem</Label> + <ImageUploader>` para uma `div` própria, antes ou depois do grid Nome/Preço.
   - Manter Nome e Preço dentro de um grid de duas colunas (ou empilhados em mobile).
   - Garantir espaçamento consistente (`space-y-4` ou `gap-4`) entre a imagem e os demais campos.
2. Opcionalmente, ajustar `src/components/ui/image-uploader.tsx` para que o botão e a legenda quebrem corretamente em telas estreitas (ex.: `whitespace-normal` no botão, se necessário).
3. Verificar visualmente no preview que o label "Preço" e o input de preço não são mais sobrepostos pelo upload.

Escopo limitado: apenas correção de layout do upload de imagem no assistente de novo cardápio. Nenhuma mudança de funcionalidade ou de outros fluxos.