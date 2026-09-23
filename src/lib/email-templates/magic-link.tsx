import * as React from 'react'

import { Button, Text } from '@react-email/components'

import { EmailShell, button, footer, text } from './brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <EmailShell siteName={siteName} preview={`Seu link de acesso ao ${siteName}`} title="Seu link de acesso">
    <Text style={text}>
      Use o botão abaixo para entrar no {siteName}. Por segurança, este link expira em poucos minutos.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Entrar no {siteName}
    </Button>
    <Text style={footer}>Se você não pediu este link, pode ignorar este e-mail.</Text>
  </EmailShell>
)

export default MagicLinkEmail
