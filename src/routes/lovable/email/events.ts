import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

async function logDeliveryEvent(
  status: 'bounced' | 'complained' | 'suppressed',
  eventId: string,
  recipient: string | undefined,
) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { error } = await supabaseAdmin.from('email_send_log').insert({
    message_id: eventId,
    template_name: 'delivery-event',
    recipient_email: (recipient ?? '').toLowerCase(),
    status,
  } as never)
  // Redeliveries repetem o mesmo event_id; conflito de unicidade é esperado.
  if (error && error.code !== '23505') {
    console.error('email_send_log delivery event insert failed', { status, code: error.code })
    throw new Error('Failed to record delivery event')
  }
}

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            // Registro interno do desfecho da entrega (histórico em email_send_log).
            // A supressão em si é aplicada pela Lovable no momento do envio.
            'email.bounced': async (event) => {
              await logDeliveryEvent('bounced', event.event_id, event.data.recipient)
            },
            'email.complaint': async (event) => {
              await logDeliveryEvent('complained', event.event_id, event.data.recipient)
            },
            'email.unsubscribed': async (event) => {
              await logDeliveryEvent('suppressed', event.event_id, event.data.recipient)
            },
          },
        })
        return handler(request)
      },
    },
  },
})
