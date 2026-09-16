# Playbook & Tutorial Técnico: Módulo de Impressão Silenciosa via QZ Tray (Modo Assinado)

> **Documentação de Arquitetura e Guia de Replicação para Outros Projetos**  
> *Versão do Módulo:* 2.0 | *Padrão de Segurança:* RSA 2048-bit / X.509 / SHA-512 | *Ambiente:* Web / Node.js / TanStack / Supabase / Edge Functions

---

## Sumário

1. [Visão Geral e Arquitetura](#1-visão-geral-e-arquitetura)
2. [Geração e Gestão do Par de Chaves Digital](#2-geração-e-gestão-do-par-de-chaves-digital)
3. [Backend & Camada de Assinatura (Security Layer)](#3-backend--camada-de-assinatura-security-layer)
4. [Frontend & Integração Client-Side (TypeScript)](#4-frontend--integração-client-side-typescript)
5. [Auto-Configurador e Instalação na Máquina Cliente](#5-auto-configurador-e-instalação-na-máquina-cliente)
6. [Componentes de Interface (UI) e Diagnósticos](#6-componentes-de-interface-ui-e-diagnósticos)
7. [Guia de Replicação Passo a Passo em Novos Projetos](#7-guia-de-replicação-passo-a-passo-em-novos-projetos)
8. [Matriz de Diagnóstico e Resolução de Problemas (Troubleshooting)](#8-matriz-de-diagnóstico-e-resolução-de-problemas-troubleshooting)

---

## 1. Visão Geral e Arquitetura

### 1.1 O Desafio da Impressão Web Direct-to-Printer
Em aplicações web de gestão (sistemas de restaurante, PDV, e-commerce, ERPs), enviar impressões térmicas diretamente para impressoras locais sem abrir a janela nativa de impressão do navegador (`window.print()`) é essencial para a agilidade operacional.

O **QZ Tray** (https://qz.io) é um serviço multiplataforma (Windows, macOS, Linux) que roda localmente na máquina do cliente como um daemon escutando em WebSockets seguros (`wss://localhost:8181` ou `ws://localhost:8182`).

### 1.2 Por que Modo Assinado (*Signed Printing*)?
O QZ Tray opera em dois modos:
1. **Modo Não Assinado (*Unsigned*):** Cada vez que a aplicação web tenta conectar ou enviar um trabalho de impressão, o QZ Tray exibe um prompt popup na tela do cliente solicitando autorização manual ("Allow / Deny"). Isso invalida a automação em cozinhas e caixas.
2. **Modo Assinado (*Signed Printing*) - IMPLEMENTADO:** A aplicação web registra um certificado digital público (`cert.pem`) confiado no QZ Tray do cliente. A cada requisição de impressão, o navegador solicita ao servidor backend uma assinatura digital calculada com a chave privada correspondente. Com isso, **o QZ Tray executa todas as impressões silenciosamente (0 popups) e com total segurança**.

### 1.3 Fluxo de Comunicação de Segurança

```
┌──────────────────────────┐             ┌──────────────────────────┐
│   Navegador (Frontend)   │             │   Servidor API / Node    │
└────────────┬─────────────┘             └────────────┬─────────────┘
             │                                        │
             │ 1. GET /api/public/qz                  │
             ├───────────────────────────────────────►│ (Retorna cert.pem público)
             │◄───────────────────────────────────────┤
             │                                        │
             │ 2. Desejando imprimir payload X        │
             │                                        │
             │ 3. POST /api/public/qz (Payload + JWT) │
             ├───────────────────────────────────────►│ 4. Valida Bearer Token JWT
             │                                        │ 5. Assina X com Chave Privada
             │◄───────────────────────────────────────┤ (RSA-SHA512)
             │ 6. Retorna assinatura base64           │
             │                                        │
             ▼                                        └──────────────────────────┘
┌──────────────────────────┐
│  QZ Tray Local Client    │
│  (wss://localhost:8181)  │
└────────────┬─────────────┘
             │ 7. Valida assinatura contra authcert.override (cert.pem)
             │ 8. Envia bytes ESC/POS direto via driver de sistema
             ▼
┌──────────────────────────┐
│ Impressora Térmica Local │
└──────────────────────────┘
```

---

## 2. Geração e Gestão do Par de Chaves Digital

### 2.1 Gerando o Par de Chaves RSA (2048 bits) via OpenSSL
Para que sua aplicação possa assinar requisições, é necessário gerar um par de chaves RSA e um certificado autoassinado de longa duração (ex: 10 anos):

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3650 -nodes -subj "/CN=SeuApp QZ Impressao"
```

Os arquivos gerados serão:
- `cert.pem`: Certificado X.509 Público (pode ser distribuído livremente e instalado no cliente).
- `key.pem`: Chave Privada RSA (deve permanecer estritamente em segredo nas variáveis de ambiente do servidor).

### 2.2 Configuração das Variáveis de Ambiente (.env)
Armazene o conteúdo dos PEMs nas variáveis de ambiente do projeto:

```env
# Certificado Público X.509
QZ_CERT_PEM="-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIU...\n-----END CERTIFICATE-----"

# Chave Privada RSA (NUNCA EXPONHA NO CLIENTE)
QZ_PRIVATE_KEY_PEM="-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAz...\n-----END RSA PRIVATE KEY-----"
```

### 2.3 Validação Automática e Normalização no Servidor (`qz-config.server.ts`)
No servidor, crie um módulo para tratar e normalizar quebras de linha (`\n`), remover aspas acidentais e validar se o cert e a chave privada efetivamente formam um par criptográfico correspondente:

```typescript
// src/lib/qz-config.server.ts
import { createPublicKey, X509Certificate } from "crypto";

export type QzConfig =
  | { ok: true; cert: string; privateKey: string; subjectCN: string }
  | { ok: false; reason: string };

let cached: QzConfig | null = null;

export function getQzConfig(): QzConfig {
  if (cached) return cached;

  const certRaw = process.env.QZ_CERT_PEM;
  const keyRaw = process.env.QZ_PRIVATE_KEY_PEM;

  if (!certRaw || !keyRaw) {
    cached = { ok: false, reason: "QZ_CERT_PEM/QZ_PRIVATE_KEY_PEM ausentes nas variáveis de ambiente." };
    return cached;
  }

  const cert = normalizePem(certRaw);
  const privateKey = normalizePem(keyRaw);

  // 1. Bloqueia o uso do cert demo default da QZ Industries
  try {
    const x509 = new X509Certificate(cert);
    if (/QZ Industries/i.test(x509.subject) || /QZ Industries/i.test(x509.issuer)) {
      cached = { ok: false, reason: "QZ_CERT_PEM é o cert de testes público da QZ Industries. Use um cert próprio." };
      return cached;
    }
  } catch (err) {
    cached = { ok: false, reason: `Certificado inválido: ${err instanceof Error ? err.message : String(err)}` };
    return cached;
  }

  // 2. Valida se a chave pública extraída do cert equivale à chave privada
  try {
    const certPub = createPublicKey(cert).export({ type: "spki", format: "der" });
    const keyPub = createPublicKey({ key: privateKey, format: "pem" }).export({ type: "spki", format: "der" });

    if (!Buffer.from(certPub).equals(Buffer.from(keyPub))) {
      cached = { ok: false, reason: "QZ_CERT_PEM e QZ_PRIVATE_KEY_PEM não correspondem ao mesmo par de chaves." };
      return cached;
    }
  } catch (err) {
    cached = { ok: false, reason: `Erro ao validar par cert/chave: ${err instanceof Error ? err.message : String(err)}` };
    return cached;
  }

  cached = { ok: true, cert, privateKey, subjectCN: "SeuApp QZ Impressao" };
  return cached;
}

export function normalizePem(raw: string): string {
  let v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (v.includes("\\n") && !v.includes("\n")) {
    v = v.replace(/\\n/g, "\n");
  }
  v = v.replace(/\r\n/g, "\n").trim();
  if (!v.includes("\n")) {
    const m = v.match(/^-----BEGIN ([A-Z ]+)-----(.*)-----END \1-----$/);
    if (m) {
      const label = m[1];
      const body = m[2].replace(/\s+/g, "");
      const chunks = body.match(/.{1,64}/g) ?? [body];
      v = `-----BEGIN ${label}\n${chunks.join("\n")}\n-----END ${label}-----`;
    }
  }
  return `${v}\n`;
}
```

---

## 3. Backend & Camada de Assinatura (Security Layer)

### 3.1 Rota Principal de API (`/api/public/qz`)
A API deve expor dois métodos HTTP:
- `GET`: Retorna o certificado público em formato JSON para o cliente frontend registrar no SDK QZ.
- `POST`: Recebe o payload a ser assinado (`request`). Exige autenticação por token Bearer (JWT de usuário logado) e assina a string usando `RSA-SHA512`.

```typescript
// src/routes/api.public.qz.ts
import { createFileRoute } from "@tanstack/react-router";
import { createSign } from "crypto";
import { z } from "zod";
import { getQzConfig } from "@/lib/qz-config.server";

const SignSchema = z.object({ request: z.string().min(1).max(64000) });

export const Route = createFileRoute("/api/public/qz")({
  server: {
    handlers: {
      GET: async () => {
        const cfg = getQzConfig();
        if (!cfg.ok) return json({ cert: "", configured: false, error: cfg.reason });
        return json({ cert: cfg.cert, configured: true, subjectCN: cfg.subjectCN });
      },
      POST: async ({ request }) => {
        // SEGURANÇA: Exige token de usuário logado para assinar payloads
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
          return json({ error: "Não autorizado." }, 401);
        }

        const cfg = getQzConfig();
        if (!cfg.ok) return json({ signature: "", configured: false, error: cfg.reason });

        const body = await request.json().catch(() => null);
        const parsed = SignSchema.safeParse(body);
        if (!parsed.success) return json({ error: "Requisição inválida." }, 400);

        try {
          const signer = createSign("RSA-SHA512");
          signer.update(parsed.data.request);
          signer.end();
          const signature = signer.sign(cfg.privateKey).toString("base64");
          return json({ signature, configured: true });
        } catch (err) {
          return json({ error: "Falha ao assinar requisição do QZ Tray." }, 500);
        }
      },
    },
  },
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
```

### 3.2 Endpoint de Download do Certificado PEM Cru (`/api/public/qz-cert.crt`)
Para facilitar o download automatizado pelo script de instalação no cliente via PowerShell/curl:

```typescript
// src/routes/api.public.qz-cert[.]crt.ts
import { createFileRoute } from "@tanstack/react-router";
import { getQzConfig } from "@/lib/qz-config.server";

export const Route = createFileRoute("/api/public/qz-cert.crt")({
  server: {
    handlers: {
      GET: async () => {
        const cfg = getQzConfig();
        if (!cfg.ok) return new Response(`# Indisponível: ${cfg.reason}`, { status: 503 });
        return new Response(cfg.cert, {
          status: 200,
          headers: {
            "Content-Type": "application/x-pem-file",
            "Content-Disposition": 'attachment; filename="qz-cert.crt"',
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
```

### 3.3 Backup via Edge Function Supabase Deno (`supabase/functions/qz-sign/index.ts`)
Caso a aplicação utilize arquitetura Serverless/Edge Functions, o mesmo endpoint pode ser exposto usando a `Web Crypto API`:

```typescript
// supabase/functions/qz-sign/index.ts (Deno Runtime)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);

  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
    false,
    ["sign"]
  );
}

serve(async (req) => {
  if (req.method === "POST") {
    const { request } = await req.json();
    const keyPem = Deno.env.get("QZ_PRIVATE_KEY_PEM")!;
    const key = await importPrivateKey(keyPem);
    const sig = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      new TextEncoder().encode(request)
    );
    const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return new Response(JSON.stringify({ signature, configured: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response("OK");
});
```

---

## 4. Frontend & Integração Client-Side (TypeScript)

### 4.1 Carregamento Sob Demanda do SDK e Callbacks de Criptografia
No arquivo `src/lib/qz-tray.ts`, carregamos o SDK via CDN e configuramos `setCertificatePromise` e `setSignaturePromise`:

```typescript
// src/lib/qz-tray.ts
const QZ_CDN = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.6/qz-tray.js";
const QZ_API = "/api/public/qz";

let securityConfigured = false;

function configureSecurity(qz: any) {
  if (securityConfigured) return;
  try {
    qz.security.setSignatureAlgorithm?.("SHA512");
  } catch { /* ignore */ }

  // 1. Fornece o Certificado Público quando o QZ solicita
  qz.security.setCertificatePromise((resolve: any, reject: any) => {
    fetch(QZ_API, { headers: { Accept: "application/json" } })
      .then((res) => res.json())
      .then((data) => (data.configured ? resolve(data.cert) : reject(new Error(data.error))))
      .catch(reject);
  });

  // 2. Solicita a assinatura do servidor enviando o token JWT
  qz.security.setSignaturePromise((toSign: string) => (resolve: any, reject: any) => {
    getAuthToken().then((token) => {
      fetch(QZ_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ request: toSign }),
      })
        .then((res) => res.json())
        .then((data) => (data.configured ? resolve(data.signature) : reject(new Error(data.error))))
        .catch(reject);
    });
  });

  securityConfigured = true;
}
```

### 4.2 Reconexão e Proteção contra Sockets "Fantasmas"
Em aplicações SPA, se o computador suspender ou perder rede, a instância global `window.qz` pode relatar `isActive() === true` com o socket interno corrompido (`sendData is not a function`). Tratamos esse estado com reconexão resiliente:

```typescript
export async function ensureQzConnected() {
  const qz = await loadQzScript();
  const wsAny = qz.websocket as any;

  const active = wsAny.isActive?.();
  const conn = wsAny.connection;
  const stale = active && (!conn || typeof conn.sendData !== "function");

  if (stale) {
    try { await qz.websocket.disconnect(); } catch { }
  }

  if (!qz.websocket.isActive() || stale) {
    try {
      await qz.websocket.connect({ retries: 1, delay: 1 });
    } catch {
      throw new Error("QZ Tray não encontrado. Verifique se o aplicativo está aberto.");
    }
  }
  return qz;
}
```

### 4.3 Comandos Térmicos ESC/POS e Corte de Papel
Para garantir velocidade máxima e compatibilidade com impressoras térmicas (Epson, Bematech, Elgin, Daruma, Diebold):
- Codificação de caracteres: `CP860` (Português/Brasil).
- Sequência ESC/POS de Corte de Papel: `GS V 0` (`\x1DV0`) para corte total e `GS V 1` (`\x1DV1`) para corte parcial.

```typescript
export function getCutSequence(cutType?: "none" | "partial" | "full"): string {
  if (cutType === "full") return "\x1DV0";
  if (cutType === "partial") return "\x1DV1";
  return "";
}

export async function printQzReceipt(
  printerName: string,
  textPayload: string,
  opts?: { feedLines?: number; cutType?: "none" | "partial" | "full" }
) {
  const qz = await ensureQzConnected();
  const feed = Math.max(0, opts?.feedLines ?? 3);
  const cut = getCutSequence(opts?.cutType ?? "full");

  // Prepara payload raw em CP860
  const finalPayload = textPayload + "\n".repeat(feed) + cut;
  const config = qz.configs.create(printerName, { encoding: "CP860" });

  await qz.print(config, [finalPayload]);
}
```

---

## 5. Auto-Configurador e Instalação na Máquina Cliente

Para que a impressão ocorra sem popups, a máquina cliente precisa registrar o arquivo `cert.pem` no QZ Tray local.

### 5.1 Estrutura do Auto-Configurador Windows (`menuzin-qz-setup.bat`)
Criamos um script `.bat` executado como Administrador que automatiza todo o processo:

```cmd
@echo off
chcp 65001 >nul
title Configuração do Módulo de Impressão QZ Tray

echo ============================================================
echo      CONFIGURAÇÃO AUTOMÁTICA DO QZ TRAY DE IMPRESSÃO
echo ============================================================
echo.

:: 1. Verifica privilégios de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Este script precisa ser executado como ADMINISTRADOR.
    echo Clique com o botão direito sobre o arquivo .bat e escolha "Executar como Administrador".
    pause
    exit /b 1
)

set "QZ_DIR=%APPDATA%\qz"
set "CERT_FILE=%~dp0cert.pem"

if not exist "%CERT_FILE%" (
    echo [ERRO] O arquivo cert.pem não foi encontrado na mesma pasta do script!
    echo Certifique-se de baixar ambos os arquivos na mesma pasta.
    pause
    exit /b 1
)

if not exist "%QZ_DIR%" mkdir "%QZ_DIR%"

echo 1/3 Copiando certificado confiado para %QZ_DIR%...
copy /Y "%CERT_FILE%" "%QZ_DIR%\cert.pem" >nul

echo 2/3 Atualizando propriedades do QZ Tray (authcert.override)...
set "PROP_FILE=%QZ_DIR%\qz-tray.properties"

:: Adiciona a linha de override se não existir
findstr /C:"authcert.override=" "%PROP_FILE%" >nul 2>&1
if %errorlevel% neq 0 (
    echo authcert.override=cert.pem>>"%PROP_FILE%"
) else (
    echo A propriedade authcert.override já existe no qz-tray.properties.
)

echo 3/3 Reiniciando o serviço QZ Tray...
taskkill /IM "qz-tray.exe" /F >nul 2>&1
timeout /t 2 /nobreak >nul

if exist "%ProgramFiles%\QZ Tray\qz-tray.exe" (
    start "" "%ProgramFiles%\QZ Tray\qz-tray.exe"
) else if exist "%ProgramFiles(x86)%\QZ Tray\qz-tray.exe" (
    start "" "%ProgramFiles(x86)%\QZ Tray\qz-tray.exe"
)

echo.
echo ============================================================
echo      [SUCESSO] QZ TRAY CONFIGURADO COM SUCESSO!
echo      As impressões agora ocorrerão de forma 100%% silenciosa.
echo ============================================================
pause
```

---

## 6. Componentes de Interface (UI) e Diagnósticos

### 6.1 Modal de Diagnóstico (`QzDiagnosticsModal.tsx`)
Permite ao operador e ao suporte da aplicação checar em tempo real:
1. Status da conexão WebSocket com o QZ Tray local.
2. Status da configuração das chaves no servidor.
3. Lista de impressoras instaladas no Windows/macOS.
4. Teste de impressão de cupom de diagnóstico com corte de papel.

---

## 7. Guia de Replicação Passo a Passo em Novos Projetos

Para replicar esta solução em qualquer novo projeto web:

### Passo 1: Gerar o Certificado e a Chave Privada
Execute o comando OpenSSL e guarde os arquivos `cert.pem` e `key.pem`:
```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3650 -nodes -subj "/CN=MeuNovoApp"
```

### Passo 2: Cadastrar as Variáveis de Ambiente
No `.env` do seu servidor/Vercel/Supabase/Docker:
- `QZ_CERT_PEM`: Conteúdo do `cert.pem`
- `QZ_PRIVATE_KEY_PEM`: Conteúdo do `key.pem`

### Passo 3: Copiar os Módulos do Servidor
Copie para o seu projeto:
- `src/lib/qz-config.server.ts` (Validação e normalização de chaves)
- Endpoint API de assinatura (`/api/public/qz`) com verificação de JWT de usuário logado.

### Passo 4: Copiar a Biblioteca Cliente
Copie `src/lib/qz-tray.ts` para a pasta de utilitários frontend do projeto.

### Passo 5: Disponibilizar o Script de Instalação para o Cliente
Disponibilize o download do `cert.pem` e do arquivo `setup.bat` na tela de configurações de impressora da aplicação.

### Passo 6: Chamar a Impressão no Fluxo de Pedidos
```typescript
import { printQzReceipt } from "@/lib/qz-tray";

const impressora = "TM-T20"; // ou nome da impressora no Windows/Mac
const textoCupom = "=== MEU NOVO APP ===\nPedido #1024\nItem A........R$ 25,00\n";

await printQzReceipt(impressora, textoCupom, { feedLines: 4, cutType: "full" });
```

---

## 8. Matriz de Diagnóstico e Resolução de Problemas (Troubleshooting)

| Sintoma / Erro | Causa Provável | Solução |
| :--- | :--- | :--- |
| `QzNotRunningError` | QZ Tray não está aberto no computador do cliente ou porta WebSocket bloqueada. | Abrir o aplicativo QZ Tray na bandeja do Windows. Verificar se a porta `8181` ou `8182` está liberada. |
| Pop-up "Allow / Deny" continua aparecendo a cada impressão | O arquivo `cert.pem` não foi configurado no `qz-tray.properties` do cliente. | Executar o script `menuzin-qz-setup.bat` como Administrador na máquina cliente. |
| `401 Unauthorized` ao assinar payload | Usuário não está autenticado na aplicação web ao tentar imprimir. | Garantir que a requisição POST para `/api/public/qz` inclua o cabeçalho `Authorization: Bearer <token_jwt>`. |
| `QZ_CERT_PEM e QZ_PRIVATE_KEY_PEM não correspondem` | O certificado e a chave privada no `.env` pertencem a pares de chaves diferentes. | Regenerar o par via OpenSSL e atualizar ambas as variáveis no servidor simultaneamente. |
| Impressão com caracteres estranhos (`ã`, `ç`, `é`) | Encoding incorreto configurado no trabalho de impressão. | Utilizar a opção `{ encoding: "CP860" }` no `qz.configs.create()`. |
| Impressora realiza corte duplo de papel | Múltiplos comandos de corte ESC/POS concatenados na mesma string. | Utilizar estritamente o comando `\x1DV0` (corte total) ou `\x1DV1` (corte parcial) uma única vez no final da string. |

---
*Playbook finalizado e verificado para replicação técnica em projetos web com módulos de impressão.*
