import type { Metadata } from 'next';
import { Inter, Fraunces, Caveat, Geist_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// Display serif — used for page hero headlines and card titles.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// Script — used for ornamental prose, hero subheadings, button labels,
// nav items. Brings hand-drawn warmth.
const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Sangguniang Bayan ng Lambunao',
    template: '%s · Sangguniang Bayan ng Lambunao',
  },
  description:
    'Official site of the Sangguniang Bayan ng Lambunao — Lambunao, Iloilo, Philippines. News, members, resolutions, and citizen services.',
  applicationName: 'SB Lambunao',
  authors: [{ name: 'Sangguniang Bayan ng Lambunao' }],
  metadataBase: new URL('https://lambunao.gov.ph'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${caveat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="bg-paper text-ink flex min-h-full flex-col"
        // Grammarly + similar extensions inject data-* attrs on <body> after SSR.
        // Suppress only the body's own-attribute hydration check; children still hydrate strictly.
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
