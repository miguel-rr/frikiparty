import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoginForm } from '@/app/login/_components/login-form';
import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { microsoftEnabled } from '@/server/better-auth/config';

export const metadata: Metadata = { title: 'Entrar — Frikiparty' };

const LoginPage = () => (
  <SiteShell>
    <main>
      <Section>
        <SectionHeader
          eyebrowText="Concilio"
          lead={`Entra con tu cuenta de Google${microsoftEnabled ? ' o de Microsoft' : ''} para abrir Los Archivos y vincular tu jugador. Para mirar la crónica no hace falta identificarse.`}
          title="Entrar"
        />
        <div className="flex justify-center">
          {/* The form reads ?next=; Suspense keeps the page statically built. */}
          <Suspense>
            <LoginForm microsoft={microsoftEnabled} />
          </Suspense>
        </div>
      </Section>
    </main>
  </SiteShell>
);

export default LoginPage;
