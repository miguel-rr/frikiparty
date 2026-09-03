'use client';

import { useEffect } from 'react';

import { TopNav } from '@/components/layout/top-nav';
import {
  BlazonDefs,
  btn,
  Footer,
  Section,
  SectionHeader,
} from '@/components/theme/primitives';

/**
 * Error boundary for the whole app. It can't use SiteShell (a server
 * component that reads the session), so it renders the theme wrapper and a
 * link-less nav itself.
 */
const ErrorPage = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="theme-night text-[1.0625rem] leading-relaxed">
      <BlazonDefs />
      <TopNav authSlot={null} links={[]} />
      <main>
        <Section>
          <SectionHeader
            eyebrowText="Algo se ha roto"
            lead="El concilio ha tropezado con un error inesperado. Prueba otra vez; si insiste, será cosa de los orcos del servidor."
            title="Un tropiezo en el camino"
          />
          <div className="flex flex-wrap justify-center gap-3">
            <button className={btn.primary} onClick={reset} type="button">
              Reintentar
            </button>
            <a className={btn.secondary} href="/">
              Volver al principio
            </a>
          </div>
          {error.digest ? (
            <p className="text-center font-mono text-(--faded) text-2xs uppercase tracking-2xl">
              Referencia: {error.digest}
            </p>
          ) : null}
        </Section>
      </main>
      <Footer />
    </div>
  );
};

export default ErrorPage;
