# Corrigir erro ao confirmar o dinheiro recebido do entregador

## O problema
Quando você clica em "Confirmar dinheiro recebido do entregador" no Caixa, aparece o erro "there is no unique or exclusion constraint matching the ON CONFLICT specification" e nada é salvo.

## Causa (confirmada no banco)
O registro de acerto agora separa dois tipos por entregador e por turno: devolução do dinheiro e pagamento das taxas. A regra do banco que impede duplicidade usa (turno, entregador, tipo). Porém, o botão de confirmar ainda tenta salvar usando só (turno, entregador), e o banco recusa.

## Correção
- No `settleDriver` (src/lib/cash.functions.ts), gravar `kind: "cash_return"` (o mesmo valor padrão usado nos registros de devolução que já existem; o valor confirmado vem da coluna) e usar `onConflict: "session_id,driver_id,kind"`.
- Conferir o valor padrão da coluna `kind` antes de mudar, para manter os acertos já existentes reconhecidos.
- Sem mudança no banco.
- Teste: confirmar o dinheiro de um entregador no turno aberto e ver o selo "Dinheiro devolvido em …".
