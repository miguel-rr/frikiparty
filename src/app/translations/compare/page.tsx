import type { Metadata } from 'next';

import { TranslationsPage } from '@/app/translations/_components/translations-page';
import { CompareView } from '@/components/translations/compare-view';

export const metadata: Metadata = { title: 'Comparar — Traducciones' };

export const dynamic = 'force-dynamic';

const TranslationsComparePage = () => (
  <TranslationsPage
    lead="Dos ficheros frente a frente: qué claves cambian de una versión a otra, o qué queda sin traducir entre el original y el español."
    title="Comparar"
  >
    <CompareView />
  </TranslationsPage>
);

export default TranslationsComparePage;
