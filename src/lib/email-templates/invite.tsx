import * as React from 'react'

import { Button, Link, Text } from '@react-email/components'

import { EmailShell, button, footer, link, text } from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <EmailShell siteName={siteName} preview={`Você foi convidado para o ${siteName}`} title="Você foi convidado">
    <Text style={text}>
      Você recebeu um convite para participar do{' '}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>
      . Clique no botão abaixo para aceitar e criar sua conta.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Aceitar convite
    </Button>
    <Text style={footer}>Se você não esperava este convite, pode ignorar este e-mail.</Text>
  </EmailShell>
)

export default InviteEmail
