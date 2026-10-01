# Liberar impressora Bluetooth no iPhone/iPad (navegador Bluefy)

## O que muda
- No iPhone e iPad, a área de impressora Bluetooth deixa de ser bloqueada só por ser iOS. Se o navegador tiver Bluetooth (como o Bluefy), os botões Parear, Reconectar e Teste ficam liberados.
- No Safari ou Chrome do iPhone, que não têm Bluetooth, aparece a mensagem: "Seu navegador não tem Bluetooth. No iPhone/iPad, abra o painel no app Bluefy (grátis na App Store)."
- Nos outros aparelhos nada muda.

## Detalhes técnicos
- `src/lib/bluetooth-printer.ts` → `getBluetoothSupport()`: remover o retorno antecipado de `isIOS`. Ordem: prévia em iframe → contexto não seguro → sem `navigator.bluetooth` (mensagem própria para iOS sugerindo o Bluefy; mensagem atual para os demais) → ok.
- Nenhuma outra tela precisa mudar: `DevicePrinterConfig.tsx` já usa `getBluetoothSupport()` para mostrar o aviso e liberar os botões.
- Teste: conferir que a verificação de erros passa; o teste real fica com você no Bluefy, no site publicado.
