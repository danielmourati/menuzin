# Erro "Collector user without key enabled for QR render" no teste do Mercado Pago

## Causa (o problema está na conta Mercado Pago, não no Menuzin)

O botão de teste cria uma cobrança Pix de R$ 1,00 na conta Mercado Pago conectada pela loja. O Mercado Pago recusou porque **essa conta não tem nenhuma chave Pix cadastrada**. Sem chave Pix, ele não consegue gerar o QR Code. O código 13253 ("Financial Identity") quer dizer exatamente isso: o recebedor ainda não está habilitado para receber Pix.

As credenciais estão funcionando, porque o Mercado Pago aceitou o acesso e só barrou a geração do Pix. Se fossem inválidas, o erro seria outro (401).

Causas possíveis, da mais comum para a menos comum:
1. A conta conectada não tem chave Pix cadastrada no app Mercado Pago.
2. A conta é um **Usuário de Teste**. Usuários de teste normalmente não têm chave Pix, então o Pix de teste falha. Nesse caso, teste com cartão ou use credenciais de produção.
3. A conta ainda está com o cadastro ou a verificação de identidade incompleta. Nesse caso o Mercado Pago bloqueia a criação de chave Pix.

## O que o lojista faz (resolve o erro)

No app Mercado Pago da conta conectada: **Seu perfil > Pix > Minhas chaves > Cadastrar chave** (CPF/CNPJ, e-mail, celular ou chave aleatória). Depois é só clicar em "Testar" de novo, sem precisar reconectar.

## O que eu ajusto no Menuzin

1. **Mensagem clara**: quando aparecer esse erro (código 13253 ou o texto "without key enabled for QR"), o painel vai mostrar: "Sua conta Mercado Pago não tem chave Pix cadastrada. Cadastre uma no app Mercado Pago (Seu perfil > Pix > Minhas chaves) e teste de novo." Se a conta for de teste, a mensagem também avisa que contas de teste não geram Pix.
2. **No checkout**: se uma cobrança Pix real de cliente falhar pelo mesmo motivo, o cliente vê "Pix indisponível no momento, escolha outra forma de pagamento" no lugar do erro técnico. O pedido não é criado com pagamento quebrado.

## Detalhes técnicos

- `src/lib/payments.functions.ts` (função de teste, perto da linha 887): novo ramo de `hint` que reconhece `/without key enabled for QR|13253/i`, com um texto diferente quando `kind === "test_user"`.
- O mesmo reconhecimento entra na criação de Pix do pedido (mesmo arquivo), retornando uma mensagem amigável.
- Um pequeno teste unitário para a função que transforma o erro em mensagem.
- Sem mudanças no banco de dados.

---

# Local de impressão duplicado ao criar e salvar

## Causa (confirmada no código)

Quando você cria um local novo e clica em **Salvar**, ele é gravado direito. Mas logo depois a tela recarrega a lista de locais gravados e mantém a cópia "ainda não salva" do mesmo local. Por isso aparecem dois "Sucos/Frituras". Se clicar em Salvar de novo, essa cópia é gravada também, e a duplicata vira real. Com dois locais iguais, cada pedido sai impresso duas vezes.

## Correção

1. Depois de salvar, cada local novo passa a usar o código que recebeu ao ser gravado. Assim a tela fica só com a versão salva e não sobra cópia.
2. O botão Salvar fica travado enquanto estiver salvando, para dois cliques seguidos não gravarem duas vezes.
3. Limpeza dos dados: procurar locais duplicados (mesmo nome, tipo e impressora na mesma loja). Ficamos com o mais antigo e apagamos os demais, mas só depois de te mostrar a lista.
4. Teste: criar um local, salvar duas vezes, fechar e abrir de novo. Deve aparecer um só e a impressão deve sair uma única vez.

## Detalhes técnicos

- `src/components/printer/PrinterConfigModal.tsx`: em `handleSave`, usar o `id` retornado por `saveTenantPrinter` para atualizar o draft daquele `localId`. No `useEffect` de `extraData`, descartar drafts sem `id` que já foram persistidos. Adicionar guarda `if (saving) return`.
- `saveTenantPrinter` (`src/lib/tenant-printers.functions.ts`): confirmar que o `id` é retornado.
