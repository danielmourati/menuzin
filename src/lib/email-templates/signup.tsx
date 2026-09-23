import * as React from 'react'

import { Button, Link, Text } from '@react-email/components'

import { EmailShell, button, footer, link, text } from './brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <EmailShell siteName={siteName} preview={`Confirme seu e-mail no ${siteName}`} title="Confirme seu e-mail">
    <Text style={text}>
      Que bom ter você no{' '}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>
      ! Falta só confirmar o endereço <strong>{recipient}</strong> para liberar o seu painel.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Confirmar meu e-mail
    </Button>
    <Text style={footer}>
      Se você não criou uma conta no {siteName}, pode ignorar esta mensagem com tranquilidade.
    </Text>
  </EmailShell>
)

export default SignupEmail
