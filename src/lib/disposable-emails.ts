// Utilitário de validação contra e-mails temporários e descartáveis.
// Bloqueia cadastros automatizados e fakes de serviços conhecidos como Yopmail, TempMail, Mailinator, etc.

const DISPOSABLE_DOMAINS = new Set<string>([
  // Domínios mais populares de e-mail temporário
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "10minutemail.co.uk",
  "tempmail.com",
  "tempmail.net",
  "tempmail.org",
  "temp-mail.org",
  "temp-mail.io",
  "mailinator.com",
  "mailinator.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "pokemail.net",
  "trashmail.com",
  "trashmail.net",
  "trashmail.me",
  "dispostable.com",
  "getnada.com",
  "abyssmail.com",
  "nada.ltd",
  "mohmal.com",
  "burnermail.io",
  "inboxalias.com",
  "throwawaymail.com",
  "fakeinbox.com",
  "crazymailing.com",
  "mytemp.email",
  "tempail.com",
  "my10minutemail.com",
  "minutemail.com",
  "20minutemail.com",
  "emailondeck.com",
  "boun.cr",
  "spambog.com",
  "disposablemail.com",
  "maildrop.cc",
  "getairmail.com",
  "filzmail.com",
  "tempinbox.com",
  "mailcatch.com",
  "generator.email",
  "tmpmail.org",
  "tmpmail.net",
  "fakemailgenerator.com",
  "owlpic.com",
  "emailondeck.com",
  "moakt.com",
  "tmailor.com",
  "minuteinbox.com",
  "anonymousemail.me",
  "tempmailo.com",
  "tempmail.plus",
  "tempmail.ninja",
  "nospam.ze.tc",
  "spamgourmet.com",
  "trashmail.at",
  "mailnesia.com",
  "receive-smss.com",
  "receive-sms-online.info",
  "tempemail.net",
  "0815.ru",
  "10minutemail.de",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
  "tinypickle.com",
  "valemail.net",
  "vomoto.com",
  "zippymail.in",
  "zmail.com",
]);

/**
 * Retorna true se o e-mail pertence a um provedor temporário/descartável conhecido.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2) return false;

  const domain = parts[1];

  // 1. Verificação exata
  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  // 2. Verificação de subdomínio / padrões (ex: *.yopmail.com, *.tempmail.*)
  if (
    domain.endsWith(".yopmail.com") ||
    domain.endsWith(".mailinator.com") ||
    domain.endsWith(".guerrillamail.com") ||
    domain.includes("temp-mail") ||
    domain.includes("10minute") ||
    domain.includes("disposable") ||
    domain.includes("trashmail") ||
    domain.includes("fakeinbox") ||
    domain.includes("burnermail")
  ) {
    return true;
  }

  return false;
}
