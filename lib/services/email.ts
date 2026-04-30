import 'server-only';

import { render } from '@react-email/render';
import { Resend } from 'resend';

import { env } from '@/env';
import QueryReplyEmail from '@/emails/query-reply';

let cachedClient: Resend | null = null;

function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

export type SendQueryReplyEmailInput = {
  to: string;
  recipientName: string;
  referenceNumber: string;
  subject: string;
  bodyMd: string;
  authorName: string;
};

export type SendEmailResult =
  | { skipped: true; reason: 'no_api_key' | 'no_from_address' }
  | { skipped: false; messageId: string }
  | { skipped: false; error: string };

export async function sendQueryReplyEmail(
  input: SendQueryReplyEmailInput,
): Promise<SendEmailResult> {
  const client = getResend();
  if (!client) return { skipped: true, reason: 'no_api_key' };
  if (!env.RESEND_FROM_EMAIL) return { skipped: true, reason: 'no_from_address' };

  try {
    const html = await render(
      QueryReplyEmail({
        recipientName: input.recipientName,
        referenceNumber: input.referenceNumber,
        subject: input.subject,
        bodyMd: input.bodyMd,
        authorName: input.authorName,
      }),
    );

    const result = await client.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: `Re: ${input.subject} (${input.referenceNumber})`,
      html,
      replyTo: env.RESEND_FROM_EMAIL,
    });

    if (result.error) {
      return { skipped: false, error: result.error.message };
    }
    if (!result.data) {
      return { skipped: false, error: 'Resend returned no message id.' };
    }
    return { skipped: false, messageId: result.data.id };
  } catch (e) {
    return { skipped: false, error: e instanceof Error ? e.message : 'Unknown email error.' };
  }
}
