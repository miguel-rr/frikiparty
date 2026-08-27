'use client';

import { useReducer } from 'react';

import { SimulatorContext } from '@/app/simulator/_components/simulator-context';
import { WizardShell } from '@/app/simulator/_components/wizard-shell';
import type { SimulatorPlayer } from '@/lib/simulator/types';
import {
  createInitialState,
  wizardReducer,
} from '@/lib/simulator/wizard-reducer';

type SimulatorAppProps = {
  players: SimulatorPlayer[];
};

const SimulatorApp = ({ players }: SimulatorAppProps) => {
  const [state, dispatch] = useReducer(
    wizardReducer,
    players,
    createInitialState,
  );

  return (
    <SimulatorContext.Provider value={{ state, dispatch }}>
      <WizardShell />
    </SimulatorContext.Provider>
  );
};

export { SimulatorApp };
