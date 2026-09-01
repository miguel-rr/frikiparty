'use client';

import { StepPanel } from '@/app/simulator/_components/ui/step-panel';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';

const IntroStep = () => (
  <div className="flex flex-col gap-6">
    <StepPanel tagText="Sin guardar nada" title="Simulador de torneo">
      <p className="text-(--faded) text-sm leading-relaxed">
        Este simulador te deja montar una edición de principio a fin, sin
        guardar nada de verdad: eliges el formato del torneo y luego formas los
        equipos con jugadores ficticios, probando bombos, draft y subasta en
        vivo.
      </p>
      <p className="text-(--faded) text-sm leading-relaxed">
        Después juega la fase de grupos y/o eliminatorias hasta tener un
        campeón, partido a partido.
      </p>
    </StepPanel>
    <WizardNav hideBack nextLabel="Empezar" />
  </div>
);

export { IntroStep };
