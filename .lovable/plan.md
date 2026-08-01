# Animação de itens flutuantes no hero da /home

Dar vida à ilustração do hero: o conjunto notebook + celular ganha um movimento suave de flutuação, e os três balões (novo pedido, notificações, WhatsApp) passam a flutuar em ritmos diferentes, com entrada suave ao carregar a página.

## O que muda

1. **Imagem principal (laptop + smartphone)**
   - Flutuação vertical lenta e contínua (sobe/desce ~10px, leve inclinação), em loop infinito.
   - Sombra acompanha o movimento para dar sensação de profundidade.

2. **Brilho de fundo (blob)**
   - O halo atrás dos dispositivos pulsa lentamente, já existe a animação `blob-pulse` no projeto e será aplicada.

3. **Balões flutuantes**
   - "Novo pedido #1058", "3 novas notificações" e "Pedido enviado ao WhatsApp" passam a flutuar cada um com duração e atraso próprios, para não se moverem em bloco.
   - Entrada com fade + leve subida escalonada quando a página carrega.
   - Micro-detalhes: o sino pulsa discretamente e o ponto vermelho de notificação pisca.

4. **Acessibilidade**
   - Todas as animações são desativadas quando o usuário tem "reduzir movimento" ativado no sistema.

## Detalhes técnicos

- `src/styles.css` (bloco `@layer utilities`, junto às animações existentes):
  - novos keyframes `float-device` (amplitude menor, 8s), `float-badge-a/b/c` (amplitudes e rotações distintas), `fade-up-in` (entrada) e `ping-soft`.
  - utilitários correspondentes `.animate-float-device`, `.animate-float-badge-a|b|c`, `.animate-fade-up-in`, com `animation-delay` variando.
  - bloco `@media (prefers-reduced-motion: reduce)` zerando `animation` nesses utilitários.
- `src/routes/index.tsx` (seção hero, ~linhas 198-231):
  - `animate-float-device` + `will-change-transform` na `<img>` do hero.
  - `animate-blob-pulse` no div do gradiente de fundo.
  - `animate-float-badge-*` + `animate-fade-up-in` nos três balões, mantendo `pointer-events-none` e as classes de posicionamento/responsividade atuais.
- Sem mudanças de layout, conteúdo ou lógica; apenas classes de animação.
