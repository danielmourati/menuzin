# Impressora: usar o mesmo certificado QZ Tray do Degust

## O que descobri
- No Degust, o QZ Tray usa **um único certificado da plataforma**, chamado "Degust / Menuzin". O Degust já foi preparado para o Menuzin usar esse mesmo certificado: quem envia a senha `QZ_SHARED_SECRET` recebe o certificado e as assinaturas.
- No Menuzin, o certificado é próprio (vem de `QZ_CERT_PEM` / `QZ_PRIVATE_KEY_PEM`). Se ele não estiver instalado no computador como confiável, o QZ Tray mostra "Menuzin wants to connect… Untrusted website", como no seu print.
- Usando o certificado do Degust, um computador que já confia no Degust passa a confiar no Menuzin também, sem nova pergunta. Basta instalar uma vez.

## O que vai mudar
1. **Senha compartilhada:** vou pedir a chave forte e salvá-la como `QZ_SHARED_SECRET` no Menuzin. A **mesma** chave precisa estar salva no Degust, com o mesmo nome.
2. **Certificado e assinatura vindos do Degust:** os endereços de impressão do Menuzin (`/api/public/qz` e `/api/public/qz-cert.crt`) passam a buscar o certificado e as assinaturas no Degust, enviando a senha pelo servidor. A senha nunca chega ao navegador. O login do lojista continua obrigatório para assinar.
3. **Plano B:** se o Degust estiver fora do ar ou a senha não estiver configurada, o Menuzin volta a usar o próprio certificado, como hoje. A impressão não para.
4. **Instalador (.bat) e guia:** o auto-configurador baixa o certificado compartilhado, então serve para Menuzin e Degust ao mesmo tempo. Os textos continuam com o nome Menuzin. A versão do instalador passa para 6, para quem já instalou saber que precisa rodar de novo.
5. **Diagnóstico:** a tela de diagnóstico mostra qual certificado está em uso ("Compartilhado Degust/Menuzin" ou "Próprio Menuzin").

## Depois de aplicar
Rode o auto-configurador novo uma vez em cada computador, como Administrador. O aviso "Untrusted website" deixa de aparecer.

## Detalhes técnicos
- Novo `src/lib/qz-shared.server.ts`: `fetchSharedCert()` e `signShared(request)`, que chamam `https://cgmgpejuoymoumyfpwkc.supabase.co/functions/v1/qz-cert` e `/qz-sign` com o cabeçalho `x-qz-shared-secret` e a anon key do Degust (publicável). Cache em memória do PEM (5 min), tempo limite de 5 s.
- `api.public.qz.ts`: GET usa primeiro o certificado compartilhado e retorna `source: "shared" | "local"`. POST mantém a checagem do JWT do Menuzin e depois assina pelo Degust. Se falhar, usa `createSign` com a chave local. O GET e o POST usam sempre a mesma origem, para o par certificado/assinatura não se misturar.
- `api.public.qz-cert[.]crt.ts`: serve o PEM compartilhado, com o local como reserva.
- `qz-tray.ts`: `QZ_INSTALLER_VERSION = 6`. O cliente não muda, porque já usa `/api/public/qz`.
- A edge function `supabase/functions/qz-sign` do Menuzin vira um proxy igual, ou é removida se não estiver em uso.
- Fica de fora: nenhuma mudança no projeto Degust. Ele já aceita a senha compartilhada, mas é preciso confirmar que `QZ_SHARED_SECRET` está salva lá com o mesmo valor.
