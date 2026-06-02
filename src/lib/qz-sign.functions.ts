// Endpoints públicos de suporte ao QZ Tray:
//  - getQzCertificate: devolve o certificado público (cert.pem) para o
//    cliente apresentar ao QZ Tray. Também é usado pelo botão de download.
//  - signQzRequest: assina, com a chave privada guardada no servidor, cada
//    requisição que o QZ Tray pede para o site assinar (SHA512). Com isso o
//    QZ Tray deixa de exibir o prompt de aceite a cada conexão/impressão,
//    desde que o cliente tenha colocado o cert.pem em `authcert.override`.
//
// Os endpoints são públicos (sem auth) porque o QZ Tray precisa do cert e
// das assinaturas para FUNCIONAR — a chave privada nunca sai do servidor.

import { createServerFn } from "@tanstack/react-start";
import { createSign } from "crypto";
import { z } from "zod";

export const getQzCertificate = createServerFn({ method: "GET" }).handler(async () => {
  const cert = process.env.QZ_CERT_PEM?.trim();
  if (!cert) {
    return { cert: "", configured: false as const };
  }
  return { cert, configured: true as const };
});

export const signQzRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      request: z.string().min(1).max(64_000),
    }),
  )
  .handler(async ({ data }) => {
    const key = process.env.QZ_PRIVATE_KEY_PEM;
    if (!key) {
      return { signature: "", configured: false as const };
    }
    const signer = createSign("RSA-SHA512");
    signer.update(data.request);
    signer.end();
    const signature = signer.sign(key).toString("base64");
    return { signature, configured: true as const };
  });
