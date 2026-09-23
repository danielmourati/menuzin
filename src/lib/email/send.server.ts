// Envio interno de e-mails do app a partir do servidor (fluxos públicos como o
// formulário de contato, que não possuem JWT de usuário).
//
// O envio é feito pela API gerenciada de e-mail da Lovable (entrega, tentativas,
// supressão e descadastro ficam do lado da Lovable). Aqui apenas registramos o
// resultado em `email_send_log` para histórico interno.

import { EmailAPIError } from '@lovable.dev/email-js'

import { sendTemplateEmail } from '@/lib/email-templates/send-email'

type SendArgs = {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

async function logSend(
  templateName: string,
  recipientEmail: string,
  status: 'sent' | 'suppressed' | 'failed',
  errorMessage?: string,
) {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await supabaseAdmin.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: recipientEmail,
      status,
      error_message: errorMessage ?? null,
    } as never)
    if (error) {
      console.error('email_send_log insert failed', { status, error })
    }
  } catch (error) {
    console.error('email_send_log insert threw', { status, error })
  }
}

export async function sendAppEmail({
  templateName,
  recipientEmail,
  idempotencyKey,
  templateData,
}: SendArgs): Promise<{ ok: boolean }> {
  const recipient = recipientEmail.toLowerCase()

  try {
    const result = await sendTemplateEmail(templateName, recipient, {
      templateData: templateData as Record<string, any> | undefined,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    })

    if (!result.sent) {
      await logSend(templateName, recipient, 'suppressed')
      console.log('Email suprimido para o destinatário', {
        templateName,
        recipient_redacted: redactEmail(recipient),
      })
      // Destinatário suprimido é um resultado esperado, não um erro.
      return { ok: true }
    }

    await logSend(templateName, recipient, 'sent')
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof EmailAPIError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error)

    await logSend(templateName, recipient, 'failed', message.slice(0, 1000))
    console.error('sendAppEmail failed', {
      templateName,
      recipient_redacted: redactEmail(recipient),
      message,
    })
    return { ok: false }
  }
}
