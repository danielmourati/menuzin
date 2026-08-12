import * as React from 'react'

import { Text } from '@react-email/components'

import { EmailShell, codeStyle, footer, text } from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailShell preview="Seu código de verificação" title="Confirme sua identidade">
    <Text style={text}>Use o código abaixo para confirmar que é você:</Text>
    <Text style={codeStyle}>{token}</Text>
    <Text style={footer}>
      Este código expira em poucos minutos. Se você não solicitou, ignore este e-mail.
    </Text>
  </EmailShell>
)

export default ReauthenticationEmail
