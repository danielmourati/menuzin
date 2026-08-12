// Envio interno de e-mails do app a partir do servidor (fluxos públicos como o
// formulário de contato, que não possuem JWT de usuário).

import { getRequest } from '@tanstack/react-start/server'

type SendArgs = {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

export async function sendAppEmail({
  templateName,
  recipientEmail,
  idempotencyKey,
  templateData,
}: SendArgs): Promise<{ ok: boolean }> {
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!serviceKey) {
    console.error('sendAppEmail: missing service role key')
    return { ok: false }
  }

  const req = getRequest()
  const origin = req ? new URL(req.url).origin : 'http://localhost:8080'

  try {
    const res = await fetch(`${origin}/lovable/email/transactional/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
    })
    if (!res.ok) {
      console.error('sendAppEmail failed', templateName, res.status)
      return { ok: false }
    }
    return { ok: true }
  } catch (error) {
    console.error('sendAppEmail error', templateName, error)
    return { ok: false }
  }
}
