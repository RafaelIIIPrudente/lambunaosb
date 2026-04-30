import Image from 'next/image';
import Link from 'next/link';

import { FacebookIcon } from '@/components/icons/facebook';
import { SOCIAL_LINKS } from '@/lib/constants/social';

const TENANT = {
  displayName: 'Sangguniang Bayan ng Lambunao',
  office: 'SB Office, 2/F Municipal Hall, Plaza Rizal, Brgy. Poblacion, Lambunao, Iloilo 5018',
  phone: '(033) 333-1234',
  email: 'sb@lambunao.gov.ph',
  dpoEmail: 'dpo@lambunao.gov.ph',
  hours: 'Mon–Fri, 08:00–17:00 PHT',
};

export function PublicFooter() {
  return (
    <footer className="border-ink-ghost/40 bg-paper-2 mt-24 border-t">
      <div className="mx-auto grid max-w-[1120px] gap-12 px-4 py-16 sm:px-8 md:grid-cols-[auto_1fr_1fr]">
        <div className="flex items-start gap-4">
          <Image
            src="/seal/lambunao-seal.png"
            width={60}
            height={60}
            alt={`Official seal of ${TENANT.displayName}, Province of Iloilo`}
            className="size-12 shrink-0 rounded-full"
          />
          <div className="text-sm leading-relaxed">
            <p className="text-navy-primary font-display text-lg leading-tight font-semibold">
              {TENANT.displayName}
            </p>
            <p className="text-ink-faint mt-1.5 font-mono text-[11px] tracking-[0.18em] uppercase">
              Province of Iloilo · Established 1948
            </p>
          </div>
        </div>

        <div className="text-sm leading-relaxed">
          <h2 className="text-ink-faint mb-3 text-xs font-semibold tracking-wide uppercase">
            Office
          </h2>
          <p className="text-ink">{TENANT.office}</p>
          <p className="text-ink mt-2">{TENANT.hours}</p>
          <p className="text-ink-soft mt-2 text-xs">
            Closed weekends and Philippine public holidays.
          </p>
        </div>

        <div className="text-sm leading-relaxed">
          <h2 className="text-ink-faint mb-3 text-xs font-semibold tracking-wide uppercase">
            Contact
          </h2>
          <p>
            <a href={`mailto:${TENANT.email}`} className="text-navy-primary hover:underline">
              {TENANT.email}
            </a>
          </p>
          <p className="text-ink mt-1">{TENANT.phone}</p>
          <p className="mt-3 text-xs">
            <span className="text-ink-faint">Data Privacy Officer:</span>{' '}
            <a href={`mailto:${TENANT.dpoEmail}`} className="text-navy-primary hover:underline">
              {TENANT.dpoEmail}
            </a>
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-xs">
            <FacebookIcon className="text-ink-faint size-3.5" aria-hidden="true" />
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noreferrer noopener"
              className="text-navy-primary hover:underline"
            >
              facebook.com/lambunaoipadayaw
            </a>
          </p>
        </div>
      </div>

      <div className="border-ink-ghost/40 border-t">
        <div className="text-ink-faint mx-auto flex max-w-[1120px] flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Sangguniang Bayan ng Lambunao. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-navy-primary">
              About
            </Link>
            <Link href="/about#privacy" className="hover:text-navy-primary">
              Privacy notice (RA 10173)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
