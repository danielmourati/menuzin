# Importar cardápio do Degust (pastelao-junin) para Menuzin (pastelaojunin)

## O que será feito
1. Ler o cardápio público em degust.app/pastelao-junin (categorias, produtos, descrições, preços, tamanhos, adicionais/observações e fotos). Se a página pública não trouxer tudo, buscar a mesma leitura pública que a própria loja Degust usa.
2. Mostrar um resumo antes de gravar: quantas categorias, produtos e tamanhos, e itens sem preço ou sem foto.
3. Gravar tudo só na loja Pastelão Junin do Menuzin, na mesma ordem do Degust:
   - categorias com ícone salgado/doce;
   - produtos com preço único ou tamanhos (P/G etc.) com "A partir de";
   - adicionais e observações ligados aos produtos;
   - pastéis montados/multi-sabor exigindo a escolha de sabores;
   - itens indisponíveis no Degust ficam indisponíveis (ocultos na loja).
4. Fotos: baixar as imagens do Degust e guardar no armazenamento do Menuzin (não apontar para o Degust).
5. Se a loja já tiver cardápio, não apagar nada sem confirmar; itens com o mesmo nome serão atualizados, não duplicados.
6. Conferir: contagem no banco igual ao Degust e abrir a loja para ver cards, preços e fotos.

## Detalhes técnicos
- Tenant destino: `cffadc30-599a-40ed-ae42-815bc09ebcfd` (slug `pastelaojunin`).
- Mesmo modelo usado nas importações de Pastelão Sousa e Los Hermanos (categorias, produtos, preços por tamanho, grupos de adicionais).
- Imagens enviadas ao bucket `tenant-assets` sob o tenant.
- Não é possível ler o banco do Degust diretamente; se faltarem dados na leitura pública, pedirei um CSV exportado pelo chat do Degust.
