import * as React from 'react'

import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'

// Identidade Menuzin (laranja #F26522 sobre fundo branco).
export const brand = {
  orange: '#F26522',
  navy: '#1F2A37',
  text: '#4B5563',
  muted: '#9CA3AF',
  border: '#F0F1F3',
}

export const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
export const container = {
  padding: '28px 28px 32px',
  maxWidth: '560px',
  border: `1px solid ${brand.border}`,
  borderRadius: '12px',
}
export const logo = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: brand.orange,
  letterSpacing: '-0.5px',
  margin: '0 0 24px',
}
export const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: brand.navy,
  margin: '0 0 16px',
}
export const text = {
  fontSize: '15px',
  color: brand.text,
  lineHeight: '1.6',
  margin: '0 0 20px',
}
export const button = {
  backgroundColor: brand.orange,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
export const link = { color: brand.orange, textDecoration: 'underline' }
export const footer = {
  fontSize: '12px',
  color: brand.muted,
  lineHeight: '1.6',
  margin: '28px 0 0',
  borderTop: `1px solid ${brand.border}`,
  paddingTop: '16px',
}
export const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '26px',
  letterSpacing: '4px',
  fontWeight: 'bold' as const,
  color: brand.navy,
  margin: '0 0 24px',
}

export const EmailShell = ({
  preview,
  title,
  siteName,
  children,
}: {
  preview: string
  title: string
  siteName?: string
  children: React.ReactNode
}) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{siteName || 'Menuzin'}</Text>
        <Heading style={h1}>{title}</Heading>
        <Section>{children}</Section>
      </Container>
    </Body>
  </Html>
)
