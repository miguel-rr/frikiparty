'use client';

import { NoticeBoard } from '@/app/_components/notice-board';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';

const IntroStep = () => (
  <div className="flex flex-col gap-6">
    <NoticeBoard title="SIMULADOR DE TORNEO">
      <div className="board flex flex-col gap-4 rounded-b-[5px] px-6 py-8 sm:px-11 sm:py-10">
        <p className="text-[#f4e6c6]/90 text-sm leading-relaxed">
          Este simulador te deja montar una edición de principio a fin, sin
          guardar nada de verdad: eliges el formato del torneo y luego formas
          los equipos con jugadores ficticios, probando bombos, draft y subasta
          en vivo.
        </p>
        <p className="text-[#f4e6c6]/90 text-sm leading-relaxed">
          Después juega la fase de grupos y/o eliminatorias hasta tener un
          campeón, partido a partido.
        </p>
      </div>
    </NoticeBoard>
    <WizardNav hideBack nextLabel="Empezar" />
  </div>
);

export { IntroStep };
