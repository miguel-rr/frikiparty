import Link from 'next/link';

import type { CardSpec } from '@/components/tournament/hearth-card';
import { PortraitCard } from '@/components/tournament/portrait-card';

type BearersFanProps = {
  cards: CardSpec[];
  slugByName: Record<string, string | undefined>;
  /** Tighter, smaller variant for the home antechamber. */
  compact?: boolean;
};

/**
 * The reigning team fanned like a dealt hand: rotated and dipping in an
 * arc from the center, overlapping, each card straightening and rising on
 * hover. Below lg the fan folds into a rhythmic grid (2x2 when compact,
 * 1-then-2 columns with a centered odd card otherwise).
 */
const BearersFan = ({
  cards,
  slugByName,
  compact = false,
}: BearersFanProps) => {
  const center = (cards.length - 1) / 2;
  /* Below lg the compact grid still reads as cards dealt on the table:
     each corner gets its own small tilt, the right column dips a touch. */
  const dealTilt = [
    'max-lg:rotate-[-2.4deg]',
    'max-lg:translate-y-2 max-lg:rotate-2',
    'max-lg:rotate-[1.7deg]',
    'max-lg:translate-y-1.5 max-lg:-rotate-2',
  ];
  const rotationStep = compact ? 4 : 4.5;
  const riseStep = compact ? 9 : 12;
  return (
    <ul
      className={
        compact
          ? 'mx-auto grid w-full max-w-105 grid-cols-2 place-items-center gap-4 lg:flex lg:max-w-none lg:items-start lg:justify-center lg:gap-0 lg:pt-3'
          : 'mx-auto grid w-full max-w-130 grid-cols-1 place-items-center gap-5 sm:grid-cols-2 lg:flex lg:max-w-none lg:items-start lg:justify-center lg:gap-0 lg:pt-4 sm:[&>li:last-child:nth-child(odd)]:col-span-2'
      }
    >
      {cards.map((card, index) => {
        const slug = slugByName[card.name];
        const offset = index - center;
        const body = (
          <PortraitCard
            card={card}
            className={compact ? 'w-full lg:w-43.75' : 'w-full lg:w-53.75'}
          />
        );
        return (
          <li
            className={`${
              compact
                ? `w-full max-w-47.5 lg:-mx-4 ${dealTilt[index % dealTilt.length]}`
                : 'w-full max-w-58.75 lg:-mx-3'
            } lg:w-auto lg:max-w-none lg:transition-transform lg:duration-300 lg:hover:z-20 lg:[transform:var(--fan)] lg:hover:[transform:translateY(-14px)]`}
            key={card.name}
            style={{
              ['--fan' as string]: `rotate(${offset * rotationStep}deg) translateY(${offset * offset * riseStep}px)`,
            }}
          >
            {slug ? (
              <Link
                className="block drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)]"
                href={`/players/${slug}`}
              >
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
};

export { BearersFan };
