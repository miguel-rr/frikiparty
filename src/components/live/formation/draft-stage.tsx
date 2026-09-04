'use client';

import { useState } from 'react';

import { btn, panel, panelGold } from '@/components/theme/primitives';
import { type DraftLiveState, optionsFor } from '@/lib/tournament/draft-live';
import type { LiveState } from '@/server/live/state';

/**
 * The draft board: whose turn it is and the whole order, the pots with
 * the taken crossed out, the teams filling up, the reference ranking.
 * The captain on the clock picks a pot, then a player.
 */
const DraftStage = ({
  live,
  draft,
  captainId,
  onPick,
  pickPending,
  pickError,
  tv,
}: {
  live: LiveState;
  draft: DraftLiveState;
  captainId: string | null;
  onPick?: (potIndex: number, playerId: string) => void;
  pickPending?: boolean;
  pickError?: string | null;
  tv?: boolean;
}) => {
  const byId = new Map(live.participants.map((p) => [p.id, p]));
  const name = (playerId: string) => byId.get(playerId)?.name ?? '…';
  const rankPos = new Map((live.ranking ?? []).map((id, i) => [id, i + 1]));
  const [potChoice, setPotChoice] = useState<number | null>(null);
  const myTurn =
    captainId !== null &&
    draft.currentCaptainId === captainId &&
    draft.phase === 'open';
  const options = myTurn && captainId ? optionsFor(draft, captainId) : [];
  const taken = new Set(draft.picks.map((p) => p.playerId));
  const rosters = new Map(draft.captainIds.map((cid) => [cid, [] as string[]]));
  for (const pick of draft.picks)
    rosters.get(pick.captainId)?.push(pick.playerId);
  const lastPick = draft.picks.at(-1);

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        @keyframes live-enter { 0% { opacity: 0; transform: translateY(24px) scale(0.96); } 100% { opacity: 1; transform: none; } }
        @keyframes live-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(240,212,138,0); } 50% { box-shadow: 0 0 28px 4px rgba(240,212,138,0.35); } }
      `}</style>

      <section
        className={`${panelGold} flex flex-col items-center gap-2 p-6 text-center`}
        style={
          draft.phase === 'open'
            ? { animation: 'live-glow 2.4s ease-in-out infinite' }
            : undefined
        }
      >
        <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          {draft.phase === 'closed'
            ? 'Draft completado'
            : draft.phase === 'paused'
              ? 'Draft en pausa'
              : `Elección ${draft.picks.length + 1} · ${draft.method === 'snake' ? 'serpiente' : 'lineal'}`}
        </span>
        <span
          className={`d-display font-black text-(--gold-hi) uppercase ${tv ? 'text-6xl' : 'text-3xl sm:text-4xl'}`}
        >
          {draft.phase === 'closed'
            ? 'Equipos decididos'
            : draft.currentCaptainId
              ? `Elige ${name(draft.currentCaptainId)}`
              : 'Nadie tiene turno'}
        </span>
        {lastPick ? (
          <span
            className="text-(--faded) text-sm"
            key={lastPick.seq}
            style={{ animation: 'live-enter 500ms ease-out both' }}
          >
            Última elección:{' '}
            <strong className="text-(--parchment)">
              {name(lastPick.playerId)}
            </strong>{' '}
            para {name(lastPick.captainId)} (bombo {lastPick.potIndex + 1})
          </span>
        ) : null}
      </section>

      {myTurn && onPick ? (
        <section
          className={`${panel} flex flex-col gap-3 p-4 ring-(--gold) ring-1`}
        >
          <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
            Es tu turno · elige un bombo y luego un jugador
          </span>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                className={`${potChoice === option.potIndex ? btn.primary : btn.secondary} px-4 py-1.5 text-sm`}
                key={option.potIndex}
                onClick={() => setPotChoice(option.potIndex)}
                type="button"
              >
                Bombo {option.potIndex + 1}
              </button>
            ))}
          </div>
          {potChoice !== null ? (
            <div className="flex flex-wrap gap-2">
              {options
                .find((o) => o.potIndex === potChoice)
                ?.players.map((pid) => (
                  <button
                    className={`${btn.secondary} px-4 py-1.5 text-sm`}
                    disabled={pickPending}
                    key={pid}
                    onClick={() => {
                      onPick(potChoice, pid);
                      setPotChoice(null);
                    }}
                    type="button"
                  >
                    {name(pid)}
                    <span className="ml-1 font-mono text-(--faded) text-2xs">
                      #{rankPos.get(pid) ?? '—'}
                    </span>
                  </button>
                ))}
            </div>
          ) : null}
          {pickError ? (
            <span className="text-(--ember) text-xs">{pickError}</span>
          ) : null}
        </section>
      ) : null}

      {/* Turn order */}
      <section className="flex flex-col gap-2">
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          Orden de elección
        </span>
        <ol className="flex flex-wrap gap-1.5">
          {draft.turnQueue.map((cid, index) => {
            const done = index < draft.picks.length;
            const current =
              index === draft.picks.length && draft.phase !== 'closed';
            return (
              <li
                className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${
                  current
                    ? 'border-(--gold-hi) bg-(--gold)/15 text-(--gold-hi)'
                    : done
                      ? 'border-(--hair) text-(--faded)/60 line-through'
                      : 'border-(--hair) text-(--parchment)'
                }`}
                // biome-ignore lint/suspicious/noArrayIndexKey: queue slots are positional.
                key={`${cid}-${index}`}
              >
                {index + 1}. {name(cid)}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Teams filling */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {draft.captainIds.map((cid) => (
          <div
            className={`${panel} flex flex-col gap-2 p-3 ${cid === draft.currentCaptainId ? 'ring-(--gold) ring-1' : ''} ${cid === captainId ? 'border-(--gold)/60' : ''}`}
            key={cid}
          >
            <span className="font-bold text-(--gold)">{name(cid)}</span>
            <ul className="flex flex-wrap gap-1.5">
              {(rosters.get(cid) ?? []).map((pid) => (
                <li
                  className="rounded-full border border-(--hair) bg-(--panel-2) px-2 py-0.5 text-(--parchment) text-xs"
                  key={pid}
                  style={{ animation: 'live-enter 500ms ease-out both' }}
                >
                  {name(pid)}
                </li>
              ))}
              {(rosters.get(cid) ?? []).length === 0 ? (
                <li className="text-(--faded)/60 text-xs italic">
                  Todavía solo
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </section>

      {/* Pots */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {draft.pots.map((pot, potIndex) => (
          <div
            className={`${panel} flex flex-col gap-1.5 p-3 ${potIndex === draft.captainPotIndex ? 'opacity-60' : ''}`}
            // biome-ignore lint/suspicious/noArrayIndexKey: pot tiers are positional.
            key={`pot-${potIndex}`}
          >
            <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
              Bombo {potIndex + 1}
              {potIndex === draft.captainPotIndex ? ' · capitanes' : ''}
            </span>
            <ul className="flex flex-col gap-0.5 text-sm">
              {pot.map((pid) => (
                <li
                  className={
                    taken.has(pid)
                      ? 'text-(--faded)/50 line-through'
                      : 'text-(--parchment)'
                  }
                  key={pid}
                >
                  <span className="mr-1.5 font-mono text-(--gold) text-2xs">
                    {rankPos.get(pid) ?? '—'}
                  </span>
                  {name(pid)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
};

export { DraftStage };
