import * as React from 'react'

import { Button, Link, Text } from '@react-email/components'

import { EmailShell, button, footer, link, text } from './brand'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailShell
    siteName={siteName}
    preview={`Confirme a troca de e-mail no ${siteName}`}
    title="Confirme a troca de e-mail"
  >
    <Text style={text}>
      Você pediu para alterar o e-mail da sua conta no {siteName} de{' '}
      <Link href={`mailto:${oldEmail}`} style={link}>
        {oldEmail}
      </Link>{' '}
      para{' '}
      <Link href={`mailto:${newEmail}`} style={link}>
        {newEmail}
      </Link>
      .
    </Text>
    <Button style={button} href={confirmationUrl}>
      Confirmar novo e-mail
    </Button>
    <Text style={footer}>
      Se não foi você, recomendamos trocar sua senha imediatamente para proteger a conta.
    </Text>
  </EmailShell>
)

export default EmailChangeEmail
