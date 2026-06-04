## Auditoria — o que já está correto (NÃO MEXER)

A arquitetura de segurança e assinatura já segue exatamente o recomendado pelo QZ Tray. Confirmado lendo o código:

| Camada | Onde está | Status |
|---|---|---|
| Chave privada `QZ_PRIVATE_KEY_PEM` | Secret de servidor, usada só em `src/lib/qz-config.server.ts` (validação) e `src/routes/api.public.qz.ts` (assinatura) | ✅ Nunca chega no bundle do frontend |
| Cert público | Servido em `GET /api/public/qz-cert.crt` (`Content-Type: application/x-pem-file`) e `GET /api/public/qz` (JSON com `subjectCN`) | ✅ Pode ser público |
| Assinatura RSA-SHA512 server-side | `POST /api/public/qz` com `createSign("RSA-SHA512")`, exige Bearer token Supabase válido (admin autenticado) | ✅ |
| Frontend QZ wiring | `src/lib/qz-tray.ts` chama `setSignatureAlgorithm("SHA512")`, `setCertificatePromise` (GET `/api/public/qz`) e `setSignaturePromise` (POST `/api/public/qz` com Authorization) | ✅ |
| Validação cert↔chave | `getQzConfig()` compara SPKI público do cert vs derivado da privada; rejeita cert demo `QZ Industries` | ✅ |
| Instalador Windows `.bat` | `buildQzWindowsInstaller` em `src/lib/qz-tray.ts` embute o cert em base64 e roda PowerShell que grava `allowed.pem` system-wide e per-user em `%PROGRAMDATA%\qz\data\certificates\` e `%APPDATA%\qz\data\certificates\`, remove o cert de `blocked.pem` e reinicia o QZ Tray | ✅ Esse é o caminho oficial de _persistent trust_ do QZ 2.2 Community |
| Edge function fallback `supabase/functions/qz-sign` | Equivalente Deno do `/api/public/qz`, também exige JWT Supabase | ✅ Manter como backup de domínio bloqueado |

Conclusão: nenhuma chave privada vaza, a assinatura está no formato que o QZ Tray aceita, e o instalador escreve o cert no caminho correto para suprimir o "Action Required" definitivamente. **Não há refatoração de segurança a fazer.**

## O que precisa melhorar (UX, não arquitetura)

1. **`admin.configuracoes.impressora.tsx` está com 1125 linhas** misturando: form de impressora, diagnóstico, instalador, checagem de cert, painel passo-a-passo, mensagens e prévia. O usuário vê muitos botões parecidos (Detectar, Testar conexão, Testar cert, Baixar cert, Baixar instalador, Diagnóstico).
2. **Download separado do `.crt` no Windows é redundante** — o `.bat` já embute o cert em `CERT_B64` e o grava sozinho. Pedir o `.crt` cria fricção e gera dúvida ("preciso colar isso no Site Manager?").
3. **Não existe um wizard claro de 1ª configuração**. Hoje o usuário precisa interpretar status espalhados pela página para saber se está pronto.
4. **`QzInstallGuide` ainda lista o download do cert como passo separado** — deve ser opcional (fallback para macOS/Linux), não obrigatório.

## Mudanças propostas (escopo mínimo)

### 1) Novo modal "Configurar impressora" — wizard de 1 tela

Substituir o conteúdo de `src/components/printer/PrinterSettingsDialog.tsx` (e botão do `QzInstallGuide`) por um wizard único, alimentado por checagens automáticas em sequência:

- **Passo 1 — Servidor pronto?** Consulta `GET /api/public/qz` (já feita via `fetchQzCertificate`). Mostra `CN=<subject>` e badge verde, ou erro se cert demo/ausente. Usuário não faz nada.
- **Passo 2 — QZ Tray instalado e rodando?** Tenta `ensureQzConnected()`. Se falhar com `QzNotRunningError`, exibe botão "Baixar QZ Tray" (link `qz.io/download`).
- **Passo 3 — Cert confiável (sem prompt)?** Mede `connectMs` (lógica já existe). Se ≤ 2000 ms → ✅ "Confiado". Se > 2000 ms (prompt apareceu) → botão único **"Baixar configurador Menuzin (.bat)"** com instrução: _"Clique direito → Executar como administrador. Ao terminar, volte aqui e clique em Testar."_
  - Linux/macOS: link expansível "Não estou no Windows" que mostra os caminhos `allowed.pem` (lógica já existe em `certPathsByOs`) + botão "Baixar cert.pem" (`/api/public/qz-cert.crt`).
- **Passo 4 — Impressora selecionada.** Combobox vindo de `listQzPrintersWithDefault`, fallback para input manual. Persistido em `printer_settings`.
- **Passo 5 — Imprimir teste.** Chama `printQzTextTest` com a prévia ASCII. Sucesso = wizard fecha verde.

Cada passo tem 3 estados visuais: `pendente` (cinza), `ok` (verde), `erro` (vermelho com mensagem amigável). Sem botões duplicados.

### 2) Página `/admin/configuracoes/impressora` — reorganizar

- Manter a página, mas **abrir o wizard automaticamente** se algum dos passos 1–3 não estiver `ok` no primeiro acesso.
- Mover Detectar / Testar conexão / Testar endpoint cert / Baixar cert / Diagnóstico para um único bloco recolhido **"Ajuda avançada"** no rodapé da página. A página principal fica focada em: status (4 badges no topo: Servidor · QZ Tray · Confiado · Impressora), seleção de impressora, prévia e botão Salvar.
- Remover o passo separado "Baixar cert.pem" do fluxo principal no Windows.

### 3) `QzInstallGuide` — simplificar

Reduzir para 3 passos: (a) instalar QZ Tray; (b) baixar e rodar o `.bat` como admin; (c) clicar "Testar de novo". Cert.pem vira link discreto _"Não estou no Windows / precisa do cert sozinho"_ no rodapé.

### 4) Mensagens amigáveis (mapeamento)

| Estado interno | Mensagem na UI |
|---|---|
| Cert ausente / demo no servidor | "Estamos configurando o servidor — contate o suporte da plataforma." (admin do tenant não pode resolver) |
| `QzNotRunningError` | "QZ Tray não está aberto. Baixe e instale, ou inicie o aplicativo." |
| `connectMs > 2000` | "Tudo conectado, mas o QZ Tray pediu confirmação manual. Rode o configurador como administrador para liberar de uma vez." |
| Assinatura 401 | "Sua sessão de admin expirou — entre novamente." |
| `listQzPrintersWithDefault` vazia | "Nenhuma impressora detectada. Conecte/instale a impressora no Windows e clique em Detectar." |

## O que NÃO vai mudar

- `src/lib/qz-config.server.ts`, `src/lib/qz-sign.functions.ts`, `src/routes/api.public.qz.ts`, `src/routes/api.public.qz-cert[.]crt.ts`, `supabase/functions/qz-sign/index.ts`: arquitetura de assinatura/cert está correta.
- `src/lib/qz-tray.ts` lado cliente (config security + helpers de impressão + builder do `.bat`): funciona. Tocar só se necessário para o wizard.
- `PrintOrderButton` / `printOrderViaQz` / receipt builder: sem alterações.
- Schema de banco: nada.

## Validação após implementar

1. Login admin → abrir `/admin/configuracoes/impressora` em máquina nova com QZ Tray instalado mas sem cert confiado: wizard abre, passo 3 marca "prompt manual", baixa `.bat`, executa, volta, testa → todos os passos verdes.
2. Mesmo fluxo em máquina já configurada: wizard NÃO abre automaticamente; status no topo da página mostra 4 badges verdes; botão "Imprimir teste" funciona sem prompt.
3. Imprimir um pedido real via `PrintOrderButton` no `admin.pedidos`: sem pop-up de "untrusted website".
4. Logout/sessão expirada → tentar imprimir: erro "sessão expirada" (não vazamento de chave).
5. macOS: link "Não estou no Windows" exibe caminhos e download do `.crt` funciona.

## Sobre certificado "oficial" do QZ (Premium Support / Company Branded)

A doc do QZ recomenda, em produção, comprar um cert assinado pelo CA do QZ ou usar a opção Company Branded para que o cert já caia em `override.crt` e dispense Site Manager. Hoje a plataforma usa cert próprio (self-signed) + `allowed.pem` automatizado pelo `.bat`. Funcionalmente equivalente para Windows (alvo principal). **Recomendação:** registrar isso como item de roadmap (não bloqueia esta entrega), com nota no painel "Ajuda avançada": _"Em uso: cert próprio Menuzin. Para impressão sem instalador em qualquer SO, considere migrar para cert assinado pelo QZ Industries (Premium Support)."_
