# Senha do dono ao cadastrar nova loja

## O que acontece hoje
Quando você cria uma loja nova, o login do dono é recusado se a senha inicial aparece em listas públicas de senhas vazadas. A mensagem de erro aparece em inglês ("Password is known to be weak...").

## Mudanças
1. **Traduzir as mensagens de erro**
   - "Password is known to be weak and easy to guess" → "Essa senha é muito comum e fácil de adivinhar. Escolha outra."
   - Também serão traduzidos outros erros comuns de login: e-mail já cadastrado, senha curta, e-mail inválido e limite de tentativas.
   - Vale para cadastrar loja, editar o acesso do dono e trocar senha.
2. **Exigir um nível a menos de segurança**
   - A senha deixa de ser recusada só por constar em listas de senhas vazadas.
   - Continuam valendo: mínimo de 8 caracteres, com pelo menos uma letra e um número.
   - O dono continua obrigado a trocar a senha no primeiro acesso.
   - Atenção: essa verificação é uma configuração única do sistema de login. Ao desligá-la, ela deixa de valer para todas as senhas do Menuzin, não só para a senha inicial do dono.

## Detalhes técnicos
- Criar um tradutor de erros de login e usá-lo nos erros de criação e atualização de usuário (`platform.functions.ts`) e nos avisos de erro do login e da troca de senha.
- Desligar a verificação de senhas vazadas nas configurações de login (`password_hibp_enabled: false`).
- Adicionar um teste pequeno do tradutor.
