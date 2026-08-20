'use client';

import { useReducer } from 'react';

import { SimulatorContext } from '@/app/simulator/_components/simulator-context';
import { WizardShell } from '@/app/simulator/_components/wizard-shell';
import {
  createInitialState,
  wizardReducer,
} from '@/lib/simulator/wizard-reducer';

const SimulatorApp = () => {
  const [state, dispatch] = useReducer(
    wizardReducer,
    undefined,
    createInitialState,
  );

  return (
    <SimulatorContext.Provider value={{ state, dispatch }}>
      <WizardShell />
    </SimulatorContext.Provider>
  );
};

export { SimulatorApp };
