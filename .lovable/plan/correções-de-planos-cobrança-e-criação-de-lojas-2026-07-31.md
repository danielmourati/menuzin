# Correções de planos, cobrança e criação de lojas

## 1. Valor e botão "Pagar via PIX" em /admin/assinatura
O card mostra R$ 127,90 porque o valor gravado na assinatura ficou congelado do preço antigo, enquanto o preço atual do plano (definido em /platform/planos) é outro.

- Exibir sempre o preço vigente do plano como fonte da verdade (`plans.monthly_price` / `annual_price` conforme o período), e sincronizar `tenant_subscriptions.amount` quando o preço do plano mudar.
- O botão "Pagar via PIX" passa a ficar ativo apenas quando a mensalidade estiver **próxima do vencimento (5 dias ou menos), em tolerância, vencida ou bloqueada**. Fora disso, botão desabilitado com texto de apoio ("Sua assinatura está em dia — vence em X dias").
- Planos gratuitos (valor 0) continuam sem botão.

## 2. FAQ da home com planos errados
Em "Quanto custa o Menuzin?" ainda aparecem "Essencial R$ 89" e "Controle R$ 159", planos que não existem mais. O FAQ passará a ler os planos ativos do banco (mesma fonte já usada na seção de preços) e montar a resposta dinamicamente (ex.: "Presença grátis e Pro por R$ X/mês"). Também corrigir a menção a "plano Controle" na pergunta sobre suporte.

## 3. Iniciar sem dados (banco zerado)
No bloco "Dados iniciais (isolamento)" do cadastro de loja, transformar as três opções em uma escolha explícita com uma quarta primeira opção **"Começar vazio (recomendado)"**, marcada por padrão, que desliga todas as demais. As opções passam a ser mutuamente coerentes: escolher "Começar vazio" desmarca categorias padrão, configurações modelo e dados demo.

## 4. Senha: olhinho e regras mais leves
- Adicionar botão de mostrar/ocultar (olho) nos campos de senha em /admin/trocar-senha e no cadastro de loja do superadmin.
- Reduzir a exigência: mínimo de 8 caracteres com pelo menos uma letra e um número. Maiúscula/minúscula/caractere especial deixam de ser obrigatórios (viram dicas opcionais na lista).
- Observação: o backend de autenticação ainda pode rejeitar senhas conhecidas como fracas (mensagem "Password is known to be weak"); manteremos a exibição amigável desse erro.

## 5. Plano padrão de novos tenants
- No cadastro do superadmin (/platform/lojas → nova loja), o seletor de plano passa a listar os planos **ativos** (incluindo Presença) e o padrão passa a ser o plano marcado como padrão/primeiro ativo, em vez de "Start" fixo.
- Se nenhum plano for escolhido/configurado, o tenant nasce em **Presença**.
- O cadastro público (auto-cadastro) continua nascendo em Presença.
- Na criação, a assinatura é gerada já com o plano e o valor corretos do plano escolhido.

## Detalhes técnicos
- `src/routes/admin.assinatura.tsx`: usar `plan.monthly_price` para exibição; condicionar o botão a `computed.expiringSoon || ["vencida","tolerancia","bloqueada","pendente"].includes(computed.effective)`.
- `src/lib/subscriptions.functions.ts`: em `getMySubscription`, alinhar `amount` ao preço vigente do plano; em `createSubscriptionCharge`, cobrar o preço vigente.
- `src/components/landing/LandingSections.tsx`: FAQ recebe os planos via props/`listPlans`.
- `src/routes/platform.tenants.novo.tsx`: opção "Começar vazio", olho na senha, regras de senha simplificadas, select de plano vindo de `listPlans` com fallback `presenca`.
- `src/routes/admin.trocar-senha.tsx`: olho na senha e regras reduzidas.
- `src/lib/platform.functions.ts`: default de plano `presenca` quando ausente.
