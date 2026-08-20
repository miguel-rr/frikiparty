import '@/styles/globals.css';

import type { Metadata } from 'next';
import {
  Anton,
  Big_Shoulders_Stencil,
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

// Next statically analyses this binding, so it must be a direct named export
// rather than re-exported at the bottom of the file.
export const metadata: Metadata = {
  title: 'Frikiparty',
  description:
    'Torneo anual de Age of the Ring por equipos. Ediciones, ranking y clasificaciones en directo.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html
      className={`${manrope.variable} ${anton.variable} ${stencil.variable} ${jetbrains.variable}`}
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
