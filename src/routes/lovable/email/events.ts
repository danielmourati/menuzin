import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

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
