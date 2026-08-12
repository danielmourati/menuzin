import * as React from 'react'

import { Text } from '@react-email/components'

import { EmailShell, footer, text } from './brand'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  subject?: string
  message?: string
}

const ContactConfirmation = ({ name, subject, message }: Props) => (
  <EmailShell
    preview="Recebemos sua mensagem — em breve retornamos"
    title="Recebemos sua mensagem"
  >
    <Text style={text}>
      {name ? `Olá, ${name}!` : 'Olá!'} Sua mensagem chegou até a equipe Menuzin e vamos responder o
      quanto antes, normalmente em até 1 dia útil.
    </Text>
    {subject ? (
      <Text style={text}>
        <strong>Assunto:</strong> {subject}
      </Text>
    ) : null}
    {message ? (
      <Text style={text}>
        <strong>Sua mensagem:</strong>
        <br />
        {message}
      </Text>
    ) : null}
    <Text style={footer}>
      Este é um e-mail automático de confirmação. Se precisar complementar algo, basta responder.
    </Text>
  </EmailShell>
)

export const template = {
  component: ContactConfirmation,
  subject: 'Recebemos sua mensagem — Menuzin',
  displayName: 'Confirmação de contato',
  previewData: {
    name: 'Daniel',
    subject: 'Dúvida sobre planos',
    message: 'Gostaria de entender melhor o plano Pro.',
  },
} satisfies TemplateEntry
