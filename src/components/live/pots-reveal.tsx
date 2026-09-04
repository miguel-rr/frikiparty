'use client';

import Link from 'next/link';

import { PortraitCard } from '@/components/tournament/portrait-card';
import { cardSpecFor } from '@/lib/tournament/card-lore';
import type { LiveState } from '@/server/live/state';

/** Milliseconds between pots and between cards within a pot. */
const POT_DELAY_MS = 1400;
const CARD_DELAY_MS = 220;

/**
 * The pots, dealt face down and turned over one tier at a time, cabezas
 * de serie first — the reveal every viewer sees when the organiser
 * publishes them, and again whenever the page is opened afterwards.
 */
const PotsReveal = ({ state }: { state: LiveState }) => {
  const byId = new Map(state.participants.map((p) => [p.id, p]));
  const leaderId = state.ranking?.[0];
  return (
    <section className="flex flex-col gap-8">
      <style>{`
        @keyframes live-card-flip {
          0% { transform: rotateY(180deg); }
          100% { transform: rotateY(0deg); }
        }
        @keyframes live-card-in {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {state.pots.map((pot, potIndex) => (
        <div
          className="flex flex-col gap-4"
          // biome-ignore lint/suspicious/noArrayIndexKey: pot tiers are positional.
          key={`pot-${potIndex}`}
          style={{
            animation: `live-card-in 600ms ease-out both`,
            animationDelay: `${potIndex * POT_DELAY_MS}ms`,
          }}
        >
          <div className="flex items-baseline justify-center gap-3">
            <span className="d-display font-bold text-(--parchment) text-xl uppercase">
              Bombo {potIndex + 1}
            </span>
            <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
              {potIndex === state.captainPotIndex
                ? 'Capitanes · cabezas de serie'
                : potIndex === 0
                  ? 'Cabezas de serie'
                  : ''}
            </span>
          </div>
          <ul className="d-roster flex w-full flex-wrap justify-center gap-x-3 gap-y-5 sm:gap-x-5">
            {pot.map((playerId, cardIndex) => {
              const participant = byId.get(playerId);
              if (!participant) return null;
              const card = cardSpecFor({
                name: participant.name,
                rings: participant.rings,
                individualRings: participant.individualRings,
                cardPortrait: participant.cardPortrait,
                cardAbility: participant.cardAbility,
                cardAbilityText: participant.cardAbilityText,
                isLeader: participant.id === leaderId,
              });
              return (
                <li
                  className="w-[calc(50%-0.375rem)] max-w-40 [perspective:1200px] sm:w-36 lg:w-40"
                  key={playerId}
                >
                  <div
                    className="relative [transform-style:preserve-3d]"
                    style={{
                      animation:
                        'live-card-flip 900ms cubic-bezier(.2,.7,.2,1) both',
                      animationDelay: `${potIndex * POT_DELAY_MS + 300 + cardIndex * CARD_DELAY_MS}ms`,
                    }}
                  >
                    <Link
                      className="block drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)] [backface-visibility:hidden]"
                      href={`/players/${participant.slug}`}
                    >
                      <PortraitCard card={card} className="w-full" />
                    </Link>
                    <CardBack />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
};

/** The face-down side: gold rim, the One Ring's seal, the house name. */
const CardBack = () => (
  <div
    aria-hidden
    className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"
  >
    <svg className="aspect-250/360 w-full" viewBox="0 0 250 360">
      <title>Carta boca abajo</title>
      <rect fill="#120d07" height="352" rx="20" width="242" x="4" y="4" />
      <rect
        fill="none"
        height="332"
        rx="13"
        stroke="#c9a557"
        strokeOpacity="0.8"
        strokeWidth="2"
        width="222"
        x="14"
        y="14"
      />
      <rect
        fill="none"
        height="312"
        rx="9"
        stroke="#c9a557"
        strokeDasharray="3 5"
        strokeOpacity="0.45"
        strokeWidth="1"
        width="202"
        x="24"
        y="24"
      />
      <circle
        cx="125"
        cy="180"
        fill="none"
        r="52"
        stroke="#f0d48a"
        strokeWidth="9"
      />
      <circle
        cx="125"
        cy="180"
        fill="none"
        r="52"
        stroke="#a8843c"
        strokeOpacity="0.6"
        strokeWidth="3"
      />
      <text
        fill="#c9a557"
        fontFamily="var(--font-cinzel), Georgia, serif"
        fontSize="16"
        fontWeight="700"
        letterSpacing="5"
        textAnchor="middle"
        x="125"
        y="300"
      >
        FRIKIPARTY
      </text>
    </svg>
  </div>
);

export { PotsReveal };
