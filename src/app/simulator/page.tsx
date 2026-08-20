import type { Metadata } from 'next';

import { SimulatorApp } from '@/app/simulator/_components/simulator-app';

export const metadata: Metadata = {
  title: 'Simulador de torneo — Frikiparty',
  description:
    'Prototipo sin persistencia para configurar un torneo y formar equipos: aleatorio, bombos, draft y subasta en vivo.',
};

const SimulatorPage = () => <SimulatorApp />;

export default SimulatorPage;
