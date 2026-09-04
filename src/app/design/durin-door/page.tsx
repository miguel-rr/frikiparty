import type { Metadata } from 'next';
import { DurinDoor } from '@/components/council/durin-door';
import { SiteShell } from '@/components/layout/site-shell';
import { pageWidth, tag } from '@/components/theme/primitives';

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Frikiparty — Tambores en lo profundo',
};

// The door counts to a moment two days out, so the "drums" state (the
// last week) shows by the real rule, not a forced flag. Re-rendered
// hourly so the target never drifts into the past.
export const revalidate = 3600;

const DRUMS_LEAD_MS = 2 * 86_400_000;

/**
 * Design check for the Doors of Durin in their last week — the
 * heartbeat, the harder glow and the "Tambores" inscription — laid out
 * exactly as /council lays out the door, for review on a phone once
 * deployed.
 */
const DurinDoorDesignPage = () => {
  const target = new Date(Date.now() + DRUMS_LEAD_MS).toISOString();
  return (
    <SiteShell>
      <main>
        <section
          className={`${pageWidth} flex flex-col gap-10 pt-4 pb-14 sm:pt-5 sm:pb-16`}
          id="durin-door-drums"
        >
          <div className="flex flex-col items-center gap-8">
            <DurinDoor target={target} />
            <span className={tag}>Prueba de diseño · Última semana</span>
            <p className="max-w-[46ch] text-center text-(--faded)">
              Así late la puerta durante la última semana: el trazado brilla más
              fuerte y la inscripción anuncia los tambores. El reloj cuenta
              hacia un instante ficticio a dos días de hoy.
            </p>
          </div>
        </section>
      </main>
    </SiteShell>
  );
};

export default DurinDoorDesignPage;
