import type { Metadata } from 'next';

import { SimulatorApp } from '@/app/simulator/_components/simulator-app';
import { SiteShell } from '@/components/layout/site-shell';
import { listPlayers } from '@/server/api/routers/player';
import { db } from '@/server/db';

export const metadata: Metadata = {
  title: 'Simulador de torneo — Frikiparty',
  description:
    'Prototipo sin persistencia para configurar un torneo y formar equipos: aleatorio, bombos, draft y subasta en vivo.',
};

const SimulatorPage = async () => {
  const players = await listPlayers(db);
  return (
    <SiteShell footerNote="Simulador: nada de lo que pase aquí se guarda.">
      <SimulatorApp players={players} />
    </SiteShell>
  );
};

export default SimulatorPage;
