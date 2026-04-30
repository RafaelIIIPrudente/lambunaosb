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
  COLORS,
  FONTS,
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

type QueryReplyEmailProps = {
  recipientName: string;
  referenceNumber: string;
  subject: string;
  bodyMd: string;
  authorName: string;
  siteUrl?: string;
};

const replyBodyParagraph = {
  ...paragraph,
  whiteSpace: 'pre-wrap' as const,
};

const signature = {
  color: COLORS.ink,
  fontFamily: FONTS.script,
  fontSize: '20px',
  fontWeight: 500,
  margin: '24px 0 4px 0',
};

const signatureRole = {
  color: COLORS.inkFaint,
  fontFamily: FONTS.mono,
  fontSize: '11px',
  letterSpacing: '0.08em',
  margin: '0',
};

export default function QueryReplyEmail({
  recipientName = 'Juan dela Cruz',
  referenceNumber = 'Q-2026-0142',
  subject = 'Permit office hours during fiesta week',
  bodyMd = 'Maraming salamat for reaching out…',
  authorName = 'Office of the Secretary',
  siteUrl = 'https://lambunao.gov.ph',
}: QueryReplyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reply from the Sangguniang Bayan ng Lambunao — {referenceNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>Sangguniang Bayan ng Lambunao</Text>
          <Heading style={heading}>Re: {subject}</Heading>
          <Text style={greeting}>Maraming salamat, {recipientName}.</Text>

          <Section style={refBlock}>
            <Text style={refLabel}>Your reference</Text>
            <Text style={refValue}>{referenceNumber}</Text>
          </Section>

          <Text style={replyBodyParagraph}>{bodyMd}</Text>

          <Text style={signature}>{authorName}</Text>
          <Text style={signatureRole}>SANGGUNIANG BAYAN NG LAMBUNAO</Text>

          <Hr style={hr} />

          <Text style={paragraph}>
            If you need to follow up on this query, please reply to this email and quote your
            reference number above.
          </Text>

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
