'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { btn } from '@/components/theme/primitives';

type WizardNavProps = {
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Dispatched right before ADVANCE, e.g. to kick off a draft or auction. */
  onBeforeNext?: () => void;
  hideBack?: boolean;
};

const WizardNav = ({
  nextLabel = 'Siguiente',
  nextDisabled = false,
  onBeforeNext,
  hideBack = false,
}: WizardNavProps) => {
  const { state, dispatch } = useSimulator();
  const canGoBack = state.stepHistory.length > 1;

  const handleNext = () => {
    onBeforeNext?.();
    dispatch({ type: 'ADVANCE' });
  };

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {!hideBack && canGoBack ? (
        <button
          className={`${btn.secondary} px-5 py-2 text-sm`}
          onClick={() => dispatch({ type: 'BACK' })}
          type="button"
        >
          ← Atrás
        </button>
      ) : (
        <span />
      )}
      <button
        className={`${btn.primary} px-6 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
        disabled={nextDisabled}
        onClick={handleNext}
        type="button"
      >
        {nextLabel} →
      </button>
    </div>
  );
};

export { WizardNav };
