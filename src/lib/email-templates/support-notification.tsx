import * as React from 'react'

import { Button, Text } from '@react-email/components'

import { EmailShell, button, footer, text } from './brand'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  whatsapp?: string
  subject?: string
  message?: string
  panelUrl?: string
}

const SupportNotification = ({ name, email, whatsapp, subject, message, panelUrl }: Props) => (
  <EmailShell
    preview={`Nova mensagem de suporte${subject ? `: ${subject}` : ''}`}
    title="Nova mensagem de suporte"
  >
    <Text style={text}>
      <strong>Nome:</strong> {name || '—'}
      <br />
      <strong>E-mail:</strong> {email || '—'}
      <br />
      <strong>WhatsApp:</strong> {whatsapp || '—'}
      <br />
      <strong>Assunto:</strong> {subject || '—'}
    </Text>
    <Text style={text}>{message || '—'}</Text>
    <Button style={button} href={panelUrl || 'https://menuzin.app/platform/suporte'}>
      Abrir no painel
    </Button>
    <Text style={footer}>Mensagem registrada automaticamente pelo formulário de contato.</Text>
  </EmailShell>
)

export const template = {
  component: SupportNotification,
  subject: (data: Record<string, any>) =>
    `[Suporte Menuzin] ${data?.subject || 'Nova mensagem'}`,
  displayName: 'Notificação de suporte',
  previewData: {
    name: 'Daniel',
    email: 'cliente@exemplo.com',
    whatsapp: '86999312882',
    subject: 'Dúvida sobre planos',
    message: 'Gostaria de entender melhor o plano Pro.',
    panelUrl: 'https://menuzin.app/platform/suporte',
  },
} satisfies TemplateEntry
