import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

import {
  button,
  container,
  eyebrow,
  footer,
  greeting,
  heading,
  hr,
  link,
  main,
  paragraph,
} from './_styles';

type DpoDeletionRequestEmailProps = {
  recipientName: string;
  referenceNumber: string;
  confirmUrl: string;
  expiresInHours?: number;
};

export default function DpoDeletionRequestEmail({
  recipientName = 'Juan dela Cruz',
  referenceNumber = 'Q-2026-0142',
  confirmUrl = 'https://lambunao.gov.ph/dpo/confirm/abc123',
  expiresInHours = 48,
}: DpoDeletionRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Confirm deletion of your query ${referenceNumber} — link valid for ${expiresInHours} hours.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>Data Privacy · RA 10173</Text>
          <Heading style={heading}>Confirm deletion of your query</Heading>
          <Text style={greeting}>Hello, {recipientName}.</Text>
          <Text style={paragraph}>
            We received a request to delete the personal data tied to your query{' '}
            <strong>{referenceNumber}</strong>. To prevent unauthorized deletion we ask that you
            confirm by clicking the button below.
          </Text>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={confirmUrl}>
              Confirm deletion →
            </Button>
          </Section>

          <Text style={paragraph}>
            This link is valid for the next {expiresInHours} hours. After confirmation, your name,
            email, IP address, and message text will be removed from our records. The audit-log
            entry of the deletion is preserved per RA 10173 §38.
          </Text>

          <Text style={paragraph}>
            If you did not request this, you can ignore this email — your data stays on file. If
            something looks suspicious, please email{' '}
            <Link href="mailto:dpo@lambunao.gov.ph" style={link}>
              dpo@lambunao.gov.ph
            </Link>
            .
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Data Protection Officer · Sangguniang Bayan ng Lambunao
            <br />
            dpo@lambunao.gov.ph · (033) 333-1234
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
