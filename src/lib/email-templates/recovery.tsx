import * as React from 'react'

import { Button, Text } from '@react-email/components'

import { EmailShell, button, footer, text } from './brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailShell siteName={siteName} preview={`Redefina sua senha no ${siteName}`} title="Redefinir sua senha">
    <Text style={text}>
      Recebemos um pedido para redefinir a senha da sua conta no {siteName}. Clique no botão abaixo para
      criar uma nova senha.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Criar nova senha
    </Button>
    <Text style={footer}>
      Se você não pediu a redefinição, ignore este e-mail — sua senha continua a mesma.
    </Text>
  </EmailShell>
)

export default RecoveryEmail
