# Remover botão "Entrar" do header das landing pages

## Contexto

As landing pages `/` e `/comece-agora` exibem um link "Entrar" no header que leva a `/admin/login`. Ele compete visualmente com o CTA principal de conversão ("Testar grátis" / "Começar Agora") sem agregar valor para o visitante novo — o objetivo da página é cadastro, não autenticação.

## O que será feito

1. Remover o link `<Link to="/admin/login">Entrar</Link>` do header de `src/routes/index.tsx`.
2. Remover o link `<Link to="/admin/login">Entrar</Link>` do header de `src/routes/comece-agora.tsx`.
3. Manter o link "Entrar" no rodapé (`LandingFooter`), pois está em hierarquia secundária e atende usuários já cadastrados sem distrair o fluxo de conversão.

## Validação

- Verificar que o header das duas rotas não exibe mais "Entrar".
- Confirmar que o CTA principal permanece visível e funcional.
- Garantir que não haja quebra de layout após a remoção.
