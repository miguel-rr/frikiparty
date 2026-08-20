'use client';

import { useEffect, useState } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { SegmentedControl } from '@/app/simulator/_components/ui/segmented-control';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { MOCK_UNOFFICIAL_GAMES } from '@/lib/simulator/mock-data';
import type { OfficialGame } from '@/lib/simulator/types';

const OFFICIAL_GAMES: { value: OfficialGame; label: string }[] = [
  { value: 'age-of-the-ring', label: 'Age of the Ring' },
  { value: 'battle-of-middle-earth', label: 'Battle of Middle-earth' },
];

const TournamentBasicsStep = () => {
  const { state, dispatch } = useSimulator();
  const [unofficialGames, setUnofficialGames] = useState(MOCK_UNOFFICIAL_GAMES);
  const [newGame, setNewGame] = useState('');

  const game = state.game;
  const kind = game?.kind ?? 'official';

  useEffect(() => {
    if (state.game) return;
    dispatch({
      type: 'SET_TOURNAMENT_BASICS',
      game: { kind: 'official', game: 'age-of-the-ring', version: '' },
    });
  }, [state.game, dispatch]);

  const setKind = (nextKind: 'official' | 'unofficial') => {
    if (nextKind === 'official') {
      dispatch({
        type: 'SET_TOURNAMENT_BASICS',
        game: { kind: 'official', game: 'age-of-the-ring', version: '' },
      });
    } else {
      dispatch({
        type: 'SET_TOURNAMENT_BASICS',
        game: { kind: 'unofficial', game: unofficialGames[0] ?? '' },
      });
    }
  };

  const addUnofficialGame = () => {
    const trimmed = newGame.trim();
    if (!trimmed || unofficialGames.includes(trimmed)) return;
    setUnofficialGames((prev) => [...prev, trimmed]);
    dispatch({
      type: 'SET_TOURNAMENT_BASICS',
      game: { kind: 'unofficial', game: trimmed },
    });
    setNewGame('');
  };

  const isValid =
    game?.kind === 'official'
      ? game.version.trim().length > 0
      : (game?.game.trim().length ?? 0) > 0;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-2xl uppercase tracking-tight">
        El torneo
      </h2>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-[0.65rem] text-muted uppercase tracking-widest">
          ¿Oficial o no oficial?
        </p>
        <SegmentedControl
          onChange={setKind}
          options={[
            { value: 'official', label: 'Oficial (AotR / BotME)' },
            { value: 'unofficial', label: 'No oficial' },
          ]}
          value={kind}
        />
      </div>

      {game?.kind === 'official' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[0.65rem] text-muted uppercase tracking-widest">
              Juego
            </p>
            <SegmentedControl
              onChange={(value) =>
                dispatch({
                  type: 'SET_TOURNAMENT_BASICS',
                  game: { ...game, game: value },
                })
              }
              options={OFFICIAL_GAMES}
              value={game.game}
            />
          </div>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[0.65rem] text-muted uppercase tracking-widest">
              Versión exacta
            </span>
            <input
              className="rounded-lg bg-panel-2 px-3 py-2 text-sm ring-1 ring-hair focus:outline-none focus:ring-amber"
              onChange={(event) =>
                dispatch({
                  type: 'SET_TOURNAMENT_BASICS',
                  game: { ...game, version: event.target.value },
                })
              }
              placeholder="p.ej. 1.06"
              value={game.version}
            />
          </label>
        </div>
      ) : null}

      {game?.kind === 'unofficial' ? (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[0.65rem] text-muted uppercase tracking-widest">
            Juego
          </p>
          <SegmentedControl
            onChange={(value) =>
              dispatch({
                type: 'SET_TOURNAMENT_BASICS',
                game: { kind: 'unofficial', game: value },
              })
            }
            options={unofficialGames.map((name) => ({
              value: name,
              label: name,
            }))}
            value={game.game}
          />
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg bg-panel-2 px-3 py-2 text-sm ring-1 ring-hair focus:outline-none focus:ring-amber"
              onChange={(event) => setNewGame(event.target.value)}
              placeholder="Añadir otro juego…"
              value={newGame}
            />
            <button
              className="rounded-lg bg-panel-2 px-4 py-2 font-semibold text-sm ring-1 ring-hair transition-colors hover:bg-hair"
              onClick={addUnofficialGame}
              type="button"
            >
              Añadir
            </button>
          </div>
        </div>
      ) : null}

      <WizardNav nextDisabled={!isValid} />
    </section>
  );
};

export { TournamentBasicsStep };
