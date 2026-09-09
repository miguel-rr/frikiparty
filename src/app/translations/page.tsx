import type { Metadata } from 'next';
import { Suspense } from 'react';

import { TranslationsPage } from '@/app/translations/_components/translations-page';
import { StringBrowser } from '@/components/translations/string-browser';

export const metadata: Metadata = { title: 'Traducciones — Frikiparty' };

export const dynamic = 'force-dynamic';

const TranslationsHome = () => (
  <TranslationsPage
    lead="Cada clave del lotr.str con el original, la traducción de la comunidad y la nuestra. Busca, filtra y escribe la cadena que queremos ver en el juego."
    title="Cadenas"
  >
    <Suspense fallback={<p className="text-(--faded) text-sm">Cargando…</p>}>
      <StringBrowser />
    </Suspense>
  </TranslationsPage>
);

export default TranslationsHome;
