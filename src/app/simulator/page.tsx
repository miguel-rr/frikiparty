import type { Metadata } from 'next';

import { SimulatorApp } from '@/app/simulator/_components/simulator-app';
import { api } from '@/trpc/server';

export const metadata: Metadata = {
  title: 'Simulador de torneo — Frikiparty',
  description:
    'Prototipo sin persistencia para configurar un torneo y formar equipos: aleatorio, bombos, draft y subasta en vivo.',
};

const SimulatorPage = async () => {
  const players = await api.player.list();
  return <SimulatorApp players={players} />;
};

export default SimulatorPage;
