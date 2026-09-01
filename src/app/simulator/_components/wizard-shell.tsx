'use client';

import type { ComponentType } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { AuctionConfigStep } from '@/app/simulator/_components/steps/auction-config-step';
import { AuctionRoomHostStep } from '@/app/simulator/_components/steps/auction-room-host-step';
import { AuctionSimulationStep } from '@/app/simulator/_components/steps/auction-simulation-step';
import { CaptainsConfigStep } from '@/app/simulator/_components/steps/captains-config-step';
import { ChampionStep } from '@/app/simulator/_components/steps/champion-step';
import { DraftMethodStep } from '@/app/simulator/_components/steps/draft-method-step';
import { DraftOrderStep } from '@/app/simulator/_components/steps/draft-order-step';
import { DraftRoomHostStep } from '@/app/simulator/_components/steps/draft-room-host-step';
import { DraftSimulationStep } from '@/app/simulator/_components/steps/draft-simulation-step';
import { IntroStep } from '@/app/simulator/_components/steps/intro-step';
import { PhasePlayStep } from '@/app/simulator/_components/steps/phase-play-step';
import { PotsReviewStep } from '@/app/simulator/_components/steps/pots-review-step';
import { RandomConfigStep } from '@/app/simulator/_components/steps/random-config-step';
import { RankingReviewStep } from '@/app/simulator/_components/steps/ranking-review-step';
import { RankingSourceStep } from '@/app/simulator/_components/steps/ranking-source-step';
import { SimulatedVotingStep } from '@/app/simulator/_components/steps/simulated-voting-step';
import { SummaryStep } from '@/app/simulator/_components/steps/summary-step';
import { TeamMethodStep } from '@/app/simulator/_components/steps/team-method-step';
import { TournamentBasicsStep } from '@/app/simulator/_components/steps/tournament-basics-step';
import { TournamentModelStep } from '@/app/simulator/_components/steps/tournament-model-step';
import { TournamentParticipantsStep } from '@/app/simulator/_components/steps/tournament-participants-step';
import { TournamentPhasesStep } from '@/app/simulator/_components/steps/tournament-phases-step';
import { TournamentSwissStep } from '@/app/simulator/_components/steps/tournament-swiss-step';
import { RingGlyph } from '@/components/theme/primitives';
import type { WizardStep } from '@/lib/simulator/types';

const STEP_COMPONENTS: Record<WizardStep, ComponentType> = {
  intro: IntroStep,
  'tournament-basics': TournamentBasicsStep,
  'tournament-model': TournamentModelStep,
  'tournament-phases': TournamentPhasesStep,
  'tournament-swiss': TournamentSwissStep,
  'tournament-participants': TournamentParticipantsStep,
  'team-method': TeamMethodStep,
  'random-config': RandomConfigStep,
  'ranking-source': RankingSourceStep,
  'simulated-voting': SimulatedVotingStep,
  'ranking-review': RankingReviewStep,
  'pots-review': PotsReviewStep,
  'captains-config': CaptainsConfigStep,
  'draft-order': DraftOrderStep,
  'draft-method': DraftMethodStep,
  'draft-simulation': DraftSimulationStep,
  'draft-room-host': DraftRoomHostStep,
  'auction-config': AuctionConfigStep,
  'auction-simulation': AuctionSimulationStep,
  'auction-room-host': AuctionRoomHostStep,
  summary: SummaryStep,
  'phase-play': PhasePlayStep,
  champion: ChampionStep,
};

const WizardShell = () => {
  const { state } = useSimulator();
  const current = state.stepHistory.at(-1) ?? 'intro';
  const StepComponent = STEP_COMPONENTS[current];

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      {current !== 'intro' ? (
        <p className="flex items-center gap-2 font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
          <RingGlyph size={11} /> Paso {state.stepHistory.length}
        </p>
      ) : null}
      <StepComponent />
    </main>
  );
};

export { WizardShell };
