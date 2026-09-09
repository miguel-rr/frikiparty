import type { Metadata } from 'next';

import { TranslationsPage } from '@/app/translations/_components/translations-page';
import { FilesDesk } from '@/components/translations/files-desk';

export const metadata: Metadata = { title: 'Ficheros — Traducciones' };

export const dynamic = 'force-dynamic';

const TranslationsFilesPage = () => (
  <TranslationsPage
    lead="Sube el lotr.str original de cada versión y la traducción española cuando salga. Cada subida dice qué cambió respecto a la anterior."
    title="Ficheros"
  >
    <FilesDesk />
  </TranslationsPage>
);

export default TranslationsFilesPage;
