import { PUBLIC_STAGES, STAGE_META, stageIndex } from '@/lib/live/stages';
import type { TournamentStage } from '@/lib/tournament/stages';

/**
 * The road of the tournament: every public stage as a bead on a line, the
 * ones behind lit gold, the current one glowing, the rest dim. Scrolls
 * sideways on narrow screens instead of wrapping.
 */
const StageTimeline = ({
  stage,
  hideVoting,
}: {
  stage: TournamentStage;
  /** Tournaments on the historical ranking skip the vote. */
  hideVoting?: boolean;
}) => {
  const current = stageIndex(stage);
  const stages = PUBLIC_STAGES.filter(
    (candidate) => !(hideVoting && candidate === 'voting'),
  );
  return (
    <ol
      aria-label="Etapas del torneo"
      className="flex w-full items-start gap-0 overflow-x-auto pb-1 [scrollbar-width:none]"
    >
      {stages.map((candidate, index) => {
        const position = stageIndex(candidate);
        const done = position < current;
        const active = candidate === stage;
        return (
          <li
            className="flex min-w-24 flex-1 flex-col items-center gap-2"
            key={candidate}
          >
            <div className="flex w-full items-center">
              <span
                aria-hidden
                className={`h-px flex-1 ${
                  index === 0
                    ? 'bg-transparent'
                    : done || active
                      ? 'bg-(--gold)/70'
                      : 'bg-(--hair)'
                }`}
              />
              <span
                aria-current={active ? 'step' : undefined}
                className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                  active
                    ? 'border-(--gold-hi) bg-(--gold) shadow-[0_0_14px_rgba(240,212,138,0.75)]'
                    : done
                      ? 'border-(--gold) bg-(--gold)/60'
                      : 'border-(--hair) bg-(--night-2)'
                }`}
              >
                {done ? (
                  <svg
                    aria-hidden
                    fill="none"
                    height="8"
                    stroke="#211803"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                    viewBox="0 0 10 8"
                    width="10"
                  >
                    <title>Etapa completada</title>
                    <path d="M1 4.2 3.6 6.8 9 1.2" />
                  </svg>
                ) : null}
              </span>
              <span
                aria-hidden
                className={`h-px flex-1 ${
                  index === stages.length - 1
                    ? 'bg-transparent'
                    : done
                      ? 'bg-(--gold)/70'
                      : 'bg-(--hair)'
                }`}
              />
            </div>
            <span
              className={`px-1 text-center font-mono text-2xs uppercase tracking-2xl ${
                active
                  ? 'font-bold text-(--gold-hi)'
                  : done
                    ? 'text-(--gold)/80'
                    : 'text-(--faded)/70'
              }`}
            >
              {STAGE_META[candidate].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export { StageTimeline };
