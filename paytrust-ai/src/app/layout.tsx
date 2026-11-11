import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'PayTrust AI — Money Moves. Trust Stays.',
    template: '%s · PayTrust AI',
  },
  description:
    'A trust-first transaction workspace that connects payments, conversations, agreements, commitments and evidence in one record.',
  applicationName: 'PayTrust AI',
  keywords: [
    'PayTrust AI',
    'transaction workspace',
    'freelancer payments',
    'agreements',
    'evidence vault',
  ],
};

export const viewport: Viewport = {
  themeColor: '#060b16',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`} data-scroll-behavior="smooth">
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
