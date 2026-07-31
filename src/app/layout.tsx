import '@/styles/globals.css';

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';

import { Header } from '@/app/_components/header';
import { TRPCReactProvider } from '@/trpc/react';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const metadata: Metadata = {
  title: 'Frikiparty',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html className={`${geist.variable}`} lang="en">
      <body>
        <TRPCReactProvider>
          <Header />
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
};

export default RootLayout;
export { metadata };
