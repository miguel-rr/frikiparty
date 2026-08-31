import '@/styles/globals.css';

import type { Metadata } from 'next';
import {
  Alegreya_Sans,
  Anton,
  Big_Shoulders_Stencil,
  Cinzel,
  JetBrains_Mono,
  Manrope,
} from 'next/font/google';

import { Header } from '@/app/_components/header';
import { TRPCReactProvider } from '@/trpc/react';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
});

const stencil = Big_Shoulders_Stencil({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-stencil',
  // Next has no fallback metrics for this face, so the size-adjust step fails
  // and warns on every build. Opting out keeps builds quiet; it only affects
  // the sign header, which is short and never reflows.
  adjustFontFallback: false,
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-jetbrains',
});

// Night-theme faces (see src/styles/theme-night.css).
const cinzel = Cinzel({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '700', '900'],
});

const alegreyaSans = Alegreya_Sans({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-alegreya',
  weight: ['400', '500', '700', '800'],
});

// Next statically analyses this binding, so it must be a direct named export
// rather than re-exported at the bottom of the file.
export const metadata: Metadata = {
  metadataBase: new URL('https://frikiparty.com'),
  title: 'Frikiparty',
  description: 'Reuniendo frikis frescos desde 2005',
  openGraph: {
    title: 'Frikiparty',
    description: 'Reuniendo frikis frescos desde 2005',
    siteName: 'Frikiparty',
    locale: 'es_ES',
    type: 'website',
    url: 'https://frikiparty.com',
    images: [
      { url: '/og-image.jpg', width: 1200, height: 630, alt: 'Frikiparty' },
    ],
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html
      className={`${manrope.variable} ${anton.variable} ${stencil.variable} ${jetbrains.variable} ${cinzel.variable} ${alegreyaSans.variable}`}
      lang="es"
    >
      <body className="min-h-screen bg-tavern font-sans text-ink antialiased">
        <TRPCReactProvider>
          <Header />
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
};

export default RootLayout;
