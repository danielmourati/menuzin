# Capa da loja e imagem do produto em tela cheia

## O que muda

**1. Header de informações da loja (anexo 1)**
- A faixa da capa fica ~20% mais alta, para a imagem de fundo respirar e não cortar o conteúdo (logo + nome).
- A capa passa a usar enquadramento que mantém o centro da imagem visível.
- Clicar na capa abre a imagem original em tela cheia (visualizador), com botão de fechar e fechamento ao tocar fora / tecla Esc.
- Se a loja não tiver capa (só gradiente de tema), nada é clicável.

**2. Imagem do produto (anexo 2)**
- Clicar na foto no topo do modal do produto abre a mesma visualização em tela cheia.
- Vale só quando existe foto real; imagem padrão (placeholder) continua sem clique.
- O efeito de parallax e os botões sobrepostos (voltar, badge da loja) continuam funcionando normalmente.

## Detalhes técnicos

- Novo componente `src/components/ui/image-lightbox.tsx`: `Dialog` sem chrome, fundo escuro, `<img>` centralizada com `object-contain`, `max-h-[90dvh]`, botão de fechar e `alt` acessível.
- `src/components/storefront/StoreAboutDrawer.tsx`: hero passa de `pb-8 pt-10` para altura ~20% maior (`pb-10 pt-14`, com `min-h`), envolvido em `<button>` quando `tenant.coverUrl` existe, abrindo o lightbox com a URL sem o gradiente.
- `src/components/storefront/ProductModal.tsx`: a camada da imagem deixa de ser `pointer-events-none` apenas na `<img>`, que recebe `onClick` para abrir o lightbox quando `!isDefaultProductImage(product.image)`; z-index abaixo do chrome existente.
- Nenhuma mudança de dados, rotas ou backend.
