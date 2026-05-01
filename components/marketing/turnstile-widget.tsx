'use client';

import { useEffect, useId } from 'react';
import Script from 'next/script';

import { env } from '@/env';

type Props = {
  onToken: (token: string) => void;
};

type TurnstileCallbackRegistry = Record<string, (token: string) => void>;

export function TurnstileWidget({ onToken }: Props) {
  const siteKey = env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
  const id = useId();
  const callbackName = `__sbTurnstileCb_${id}`;

  useEffect(() => {
    const reg = window as unknown as TurnstileCallbackRegistry;
    reg[callbackName] = (token: string) => onToken(token);
    return () => {
      delete reg[callbackName];
    };
  }, [callbackName, onToken]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-callback={callbackName}
        data-theme="light"
        data-size="normal"
      />
    </>
  );
}
