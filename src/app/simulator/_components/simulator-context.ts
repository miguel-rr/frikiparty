'use client';

import { createContext, type Dispatch, useContext } from 'react';

import type { WizardAction, WizardState } from '@/lib/simulator/types';

type SimulatorContextValue = {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
};

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

const useSimulator = (): SimulatorContextValue => {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within SimulatorApp');
  }
  return context;
};

export { SimulatorContext, useSimulator };
