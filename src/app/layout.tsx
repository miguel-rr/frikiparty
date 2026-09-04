import '@/styles/globals.css';

import type { Metadata } from 'next';
import { Alegreya_Sans, Cinzel, JetBrains_Mono } from 'next/font/google';

import { MusicProvider } from '@/components/music/music-provider';
import { env } from '@/env';
import { musicTrackUrls } from '@/lib/music';
import { TRPCReactProvider } from '@/trpc/react';

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
  // The whole site stays out of search engines: every page inherits this
  // noindex (crawling itself stays allowed so bots can actually read it).
  robots: { index: false, follow: false },
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
      { url: '/og-image-v2.jpg', width: 1200, height: 630, alt: 'Frikiparty' },
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
      className={`${jetbrains.variable} ${cinzel.variable} ${alegreyaSans.variable}`}
      lang="es"
    >
      <body className="min-h-screen bg-(--night) antialiased">
        {/* The player lives here, above every page, so navigating never cuts the music. */}
        <MusicProvider tracks={musicTrackUrls(env.R2_PUBLIC_URL)}>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </MusicProvider>
      </body>
    </html>
  );
};

export default RootLayout;
