import type { Metadata } from 'next';

import { TranslationsPage } from '@/app/translations/_components/translations-page';
import { ExportPanel } from '@/components/translations/export-panel';

export const metadata: Metadata = { title: 'Exportar — Traducciones' };

export const dynamic = 'force-dynamic';

const TranslationsExportPage = () => (
  <TranslationsPage
    lead="El lotr.str para el juego: la traducción española con nuestras cadenas encima y, si faltan claves, el original para rellenarlas."
    title="Exportar"
  >
    <ExportPanel />
  </TranslationsPage>
);

export default TranslationsExportPage;
