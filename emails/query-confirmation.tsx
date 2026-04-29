import {
  Body,
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
  container,
  eyebrow,
  footer,
  greeting,
  heading,
  hr,
  link,
  main,
  paragraph,
  refBlock,
  refLabel,
  refValue,
} from './_styles';

type QueryConfirmationEmailProps = {
  recipientName: string;
  referenceNumber: string;
  subject: string;
  siteUrl?: string;
};

export default function QueryConfirmationEmail({
  recipientName = 'Juan dela Cruz',
  referenceNumber = 'Q-2026-0142',
  subject = 'Permit office hours during fiesta week',
  siteUrl = 'https://lambunao.gov.ph',
}: QueryConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Reference {referenceNumber} — we received your message and will reply within 1–3 business
        days.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>Sangguniang Bayan ng Lambunao</Text>
          <Heading style={heading}>Thank you. We received your message.</Heading>
          <Text style={greeting}>Maraming salamat, {recipientName}.</Text>
          <Text style={paragraph}>
            We&apos;ve logged your query about <em>{subject}</em>. The Office of the Sanggunian
            typically replies within 1–3 business days. Save the reference below in case you need to
            follow up.
          </Text>

          <Section style={refBlock}>
            <Text style={refLabel}>Your reference number</Text>
            <Text style={refValue}>{referenceNumber}</Text>
          </Section>

          <Text style={paragraph}>
            If you no longer want this message kept on file, you can request deletion by emailing{' '}
            <Link href="mailto:dpo@lambunao.gov.ph" style={link}>
              dpo@lambunao.gov.ph
            </Link>
            . Per RA 10173, your name and email are retained for three years for the sole purpose of
            responding to this query.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Sangguniang Bayan ng Lambunao
            <br />
            SB Office, 2/F Municipal Hall, Plaza Rizal, Brgy. Poblacion, Lambunao, Iloilo 5018
            <br />
            (033) 333-1234 ·{' '}
            <Link href={siteUrl} style={link}>
              {siteUrl.replace(/^https?:\/\//, '')}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
