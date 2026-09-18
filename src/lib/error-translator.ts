/**
 * Utility to format and translate error messages into plain Portuguese (pt-BR)
 * adhering to Nielsen's 9th Usability Heuristic:
 * "Help users recognize, diagnose, and recover from errors".
 *
 * Principles:
 * 1. Plain language (pt-BR) without raw technical codes or English strings.
 * 2. Clearly explain the exact problem.
 * 3. Provide constructive, actionable recovery steps.
 */

export function formatErrorMessage(error: unknown, defaultFallback?: string): string {
  let message = "";

  if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    const errObj = error as { message?: string; error_description?: string; details?: string };
    message = errObj.message || errObj.error_description || errObj.details || "";
  }

  if (!message) {
    return defaultFallback || "Não foi possível concluir a operação. Por favor, tente novamente em instantes.";
  }

  // Handle raw Zod JSON error arrays (e.g. '[{"code":"too_small","minimum":8,"path":["whatsapp"]}]')
  if (/^\s*\[\s*\{.*"code":/s.test(message)) {
    try {
      const parsed = JSON.parse(message);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        const field = Array.isArray(first.path) && first.path.length > 0 ? first.path[0] : "";
        const fieldNames: Record<string, string> = {
          whatsapp: "Número de WhatsApp",
          email: "E-mail",
          password: "Senha",
          code: "Código de verificação",
          name: "Nome",
        };
        const translatedField = fieldNames[String(field)] || String(field) || "campo";

        if (first.message && typeof first.message === "string" && !first.message.includes("{") && /[áàâãéèêíïóôõúüç]/i.test(first.message)) {
          return first.message;
        }

        if (first.code === "too_small") {
          return `O campo ${translatedField} deve conter no mínimo ${first.minimum} caracteres.`;
        }
        if (first.code === "too_big") {
          return `O campo ${translatedField} deve conter no máximo ${first.maximum} caracteres.`;
        }
        return `Preencha o campo ${translatedField} corretamente.`;
      }
    } catch {
      /* ignore json parse fail */
    }
  }

  // 1. E-mail já cadastrado / Usuário existente
  if (
    /already registered|already exists|duplicate key|users_email_key|user with this email/i.test(message)
  ) {
    return "Já existe uma conta cadastrada com este e-mail. Por favor, faça login para acessar ou solicite a redefinição de senha.";
  }

  // 2. Credenciais de login inválidas
  if (
    /invalid login credentials|invalid credentials|user not found|invalid email or password|wrong password/i.test(
      message
    )
  ) {
    return "E-mail ou senha incorretos. Verifique os dados digitados e tente novamente.";
  }

  // 3. E-mail não confirmado
  if (/email not confirmed|email_not_confirmed/i.test(message)) {
    return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (ou spam) para ativar a conta.";
  }

  // 4. Senha fraca / curta
  if (
    /password should be at least|password is too short/i.test(message) ||
    (/password/i.test(message) && /least|short|weak|character/i.test(message))
  ) {
    return "A senha deve conter no mínimo 8 caracteres para garantir a segurança da sua conta.";
  }

  // 5. Rate limit / Excesso de tentativas
  if (
    /rate limit|too many requests|for security purposes|can only request this once/i.test(message)
  ) {
    return "Limite de solicitações atingido por segurança. Por favor, aguarde alguns minutos e tente novamente.";
  }

  // 6. Token / Link expirado
  if (/token has expired|link is invalid|expired|invalid token/i.test(message)) {
    return "O link de validação expirou ou é inválido. Por favor, solicite um novo envio.";
  }

  // 7. Erro de rede / conexão / offline
  if (/failed to fetch|network error|networkerror|fetch failed|offline/i.test(message)) {
    return "Falha de conexão com o servidor. Verifique sua internet e tente novamente.";
  }

  // 8. Se a mensagem já está em português com acentuação ou termos conhecidos do sistema
  if (/[áàâãéèêíïóôõúüçÁÀÂÃÉÈÊÍÏÓÔÕÚÜÇ]|conta|senha|acesso|inválid|informe|obrigatóri|tente|excedido/i.test(message)) {
    return message;
  }

  // Fallback em Português
  return defaultFallback || "Não foi possível concluir a ação. Por favor, revise os dados e tente novamente.";
}
