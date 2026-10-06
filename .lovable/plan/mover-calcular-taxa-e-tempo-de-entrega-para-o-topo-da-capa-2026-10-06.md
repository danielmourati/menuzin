# Mover "Calcular taxa e tempo de entrega" para o topo da capa

## O que muda
- O botão sai de baixo do card da loja e passa a ficar na capa, ao lado do botão de menu (hambúrguer), ocupando o espaço entre ele e os botões de compartilhar/favoritar.
- Formato de "pílula" compacta, mesma altura dos botões redondos (36px), com ícone de localização + texto curto truncado (ex.: "Calcular taxa e tempo" / "Entregar em Centro · R$ 5,00").
- Contraste garantido em qualquer capa (clara ou escura): fundo branco quase opaco com leve desfoque, texto escuro, ícone na cor da loja, borda fina e sombra. Assim fica legível sobre fotos escuras e se destaca também sobre fotos claras.
- O menu "Como você quer receber" e a janela de cálculo continuam iguais, abrindo a partir da nova posição.
- Na barra que fica fixa ao rolar a página (onde o hambúrguer reaparece), o botão também aparece ao lado dele, no mesmo estilo.

## Detalhes técnicos
- `ReceiveModeBar` ganha prop `variant: "pill"`, renderizando o gatilho compacto (`h-9 rounded-full bg-background/95 backdrop-blur border shadow-md text-foreground`, `max-w` com `truncate`); remove o uso em `$slug.tsx` linha ~617.
- Inserir `<ReceiveModeBar variant="pill" />` dentro do `div` do hambúrguer (linha ~496, com `min-w-0 flex-1`) e no cabeçalho fixo (~759).
- Popover com `align="start"` e `collisionPadding` para não estourar a tela no celular.
- Conferir no navegador (mobile 360px) com capa escura e clara.
