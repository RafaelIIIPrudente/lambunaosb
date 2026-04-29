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

type PasswordResetEmailProps = {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes?: number;
};

export default function PasswordResetEmail({
  recipientName = 'Secretary',
  resetUrl = 'https://lambunao.gov.ph/reset-password/callback?code=xxx',
  expiresInMinutes = 15,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Reset your SB Lambunao admin password — link valid for ${expiresInMinutes} minutes.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>SB Lambunao Admin · Sign-in</Text>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={greeting}>Welcome back, {recipientName}.</Text>
          <Text style={paragraph}>
            Someone (hopefully you) asked to reset the password on your SB Lambunao admin account.
            Click the button below to choose a new one. The link is valid for the next{' '}
            {expiresInMinutes} minutes.
          </Text>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={resetUrl}>
              Choose a new password →
            </Button>
          </Section>

          <Text style={paragraph}>
            If you didn&apos;t request this, ignore this email — your password stays as it is. If
            you keep getting these without asking, email{' '}
            <Link href="mailto:it@lambunao.gov.ph" style={link}>
              it@lambunao.gov.ph
            </Link>{' '}
            so we can investigate.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Sangguniang Bayan ng Lambunao · Authorized officials only
            <br />
            (033) 333-1234 · sb@lambunao.gov.ph
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
