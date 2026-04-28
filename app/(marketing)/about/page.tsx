import { Mail, Phone } from 'lucide-react';

import { ImagePlaceholder } from '@/components/ui/image-placeholder';

export const metadata = {
  title: 'About',
  description: 'About the Sangguniang Bayan ng Lambunao — our mandate, office, and contacts.',
};

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-[1100px] px-4 py-12 sm:px-8 md:py-16">
        <header className="mb-12">
          <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            About
          </p>
          <h1 className="text-ink font-display text-5xl font-bold tracking-tight md:text-6xl">
            The Sangguniang Bayan of Lambunao
          </h1>
        </header>

        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr]">
          {/* Body */}
          <div className="text-navy-primary font-display flex flex-col gap-5 text-lg leading-relaxed italic">
            <p>
              The <strong className="font-semibold not-italic">Sangguniang Bayan</strong>{' '}
              (&ldquo;Municipal Council&rdquo;) is the legislative body of the Municipality of
              Lambunao. It is composed of the Vice Mayor as presiding officer, seven elected
              members, and three ex-officio members representing the youth, the barangay captains,
              and the Indigenous Peoples Mandatory Representative.
            </p>
            <p>
              Our regular sessions are open to the public and held weekly at the Session Hall, 2/F
              Municipal Hall.
            </p>
            <div className="mt-6 space-y-2">
              <div className="bg-paper-3 h-1.5 w-full rounded-full" />
              <div className="bg-paper-3 h-1.5 w-2/3 rounded-full" />
              <div className="bg-paper-3 h-1.5 w-3/4 rounded-full" />
            </div>
          </div>

          {/* Sidebar — office card + map */}
          <aside className="flex flex-col gap-5">
            <div className="border-ink/25 rounded-md border p-5">
              <p className="text-rust mb-3 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                Office
              </p>
              <p className="text-navy-primary font-display text-base leading-relaxed italic">
                SB Office, 2/F Municipal Hall
                <br />
                Plaza Rizal, Brgy. Poblacion
                <br />
                Lambunao, Iloilo · 5018
              </p>
              <hr className="border-ink/15 my-4 border-t border-dashed" />
              <ul className="text-ink-soft flex flex-col gap-2 text-sm">
                <li className="flex items-center gap-2.5">
                  <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-display italic">(033) 333-1234</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                  <a
                    href="mailto:sb@lambunao.gov.ph"
                    className="text-navy-primary font-display italic hover:underline"
                  >
                    sb@lambunao.gov.ph
                  </a>
                </li>
              </ul>
              <p className="text-rust mt-5 mb-1 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                Office hours
              </p>
              <p className="text-navy-primary font-display text-base leading-relaxed italic">
                Mon–Fri · 8:00 AM – 5:00 PM
                <br />
                Closed weekends &amp; PH holidays
              </p>
            </div>

            <div className="border-ink/30 rounded-md border border-dashed p-1.5">
              <ImagePlaceholder ratio="4:3" label="Map · OpenStreetMap embed" />
            </div>
          </aside>
        </div>
      </section>

      {/* Privacy strip */}
      <section id="privacy" className="bg-rust/8 border-rust/20 border-t border-b">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-8">
          <p className="text-rust mb-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Data Privacy Act notice
          </p>
          <p className="text-navy-primary font-display max-w-4xl text-base leading-relaxed italic">
            In accordance with the Data Privacy Act of 2012 (RA 10173), the LGU collects only the
            personal information necessary to fulfill its mandate. Submitted queries store name +
            email, retained for 3 years. You may request deletion at{' '}
            <a
              href="mailto:dpo@lambunao.gov.ph"
              className="text-rust font-medium not-italic hover:underline"
            >
              dpo@lambunao.gov.ph
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
