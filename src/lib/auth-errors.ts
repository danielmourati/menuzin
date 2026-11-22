const RULES: [RegExp, string][] = [
  [/known to be weak|easy to guess|pwned/i, "Essa senha é muito comum e fácil de adivinhar. Escolha outra."],
  [/already (been )?registered|already exists/i, "Este e-mail já está cadastrado."],
  [/password should be at least|password.*(short|length)/i, "A senha é muito curta (mínimo de 8 caracteres)."],
  [/invalid.*email|email.*invalid/i, "E-mail inválido."],
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/rate limit|too many requests/i, "Muitas tentativas. Aguarde alguns minutos e tente novamente."],
  [/same.*password|different from the old/i, "A nova senha precisa ser diferente da atual."],
];

export function translateAuthError(msg?: string | null, fallback = "Não foi possível concluir. Tente novamente."): string {
  if (!msg) return fallback;
  for (const [re, pt] of RULES) if (re.test(msg)) return pt;
  return msg;
}
