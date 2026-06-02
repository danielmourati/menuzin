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
    const raw = process.env.QZ_PRIVATE_KEY_PEM;
    if (!raw) {
      return { signature: "", configured: false as const };
    }
    // Quando o usuário cola a chave no formulário de secrets, eventualmente
    // os \n vêm escapados como literal "\\n" ou o PEM perde as quebras de linha
    // ao passar por algum copy/paste. Normalizamos para PEM válido antes de
    // entregar ao Node crypto, que é estrito com o formato.
    const key = normalizePem(raw);
    try {
      const signer = createSign("RSA-SHA512");
      signer.update(data.request);
      signer.end();
      const signature = signer.sign(key).toString("base64");
      return { signature, configured: true as const };
    } catch (err) {
      console.error("[qz-sign] Falha ao assinar requisição QZ Tray", {
        message: err instanceof Error ? err.message : String(err),
        keyHead: key.slice(0, 32),
        keyTail: key.slice(-32),
      });
      throw new Error(
        "Falha ao assinar requisição do QZ Tray. Verifique se QZ_PRIVATE_KEY_PEM está em formato PEM válido (BEGIN/END PRIVATE KEY).",
      );
    }
  });

function normalizePem(raw: string): string {
  let v = raw.trim();
  // Caso o secret tenha vindo com \n literais
  if (v.includes("\\n") && !v.includes("\n")) {
    v = v.replace(/\\n/g, "\n");
  }
  // Remove aspas externas se houver
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  // Normaliza CRLF
  v = v.replace(/\r\n/g, "\n").trim();
  // Se está numa única linha (sem quebras), reconstrói o PEM
  if (!v.includes("\n")) {
    const m = v.match(/^-----BEGIN ([A-Z ]+)-----(.*)-----END \1-----$/);
    if (m) {
      const label = m[1];
      const body = m[2].replace(/\s+/g, "");
      const chunks = body.match(/.{1,64}/g) ?? [body];
      v = `-----BEGIN ${label}-----\n${chunks.join("\n")}\n-----END ${label}-----`;
    }
  }
  return v + "\n";
}
